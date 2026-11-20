#!/usr/bin/env python3
"""Carga inicial da loja Trio Kids a partir do PDF do catálogo da Linha Petit.

Uso: python ferramentas/carga_inicial.py "../Catalogo_Trio_Kids_Linha_Petit_Tabela_Divertida.pdf"

Escreve na raiz do projeto: dados-iniciais/*.csv, catalogo.json, img/logo.png, fotos/*.jpg.
Requer PyMuPDF (import fitz) e Pillow. Só para rodar na máquina do dono; o site não usa.
"""
import csv
import io
import json
import sys
import warnings
from datetime import datetime, timezone
from pathlib import Path

warnings.filterwarnings("ignore")
import fitz  # noqa: E402  (PyMuPDF)
from PIL import Image  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
COLUNAS = ["codigo", "nome", "cor", "categoria", "colecao", "preco", "ativo", "destaque",
           "campanha", "fotos", "descricao", "P", "M", "G", "1", "2", "3", "4", "6"]
LADO_MIN = 500   # só entram imagens com lado maior >= 500 px
LADO_MAX = 1600  # fotos reduzidas a 1600 px no lado maior
QUALIDADE = 80

# codigo, nome, cor, categoria, preco, estoque, paginas de foto (1-based), destaque
PECAS = [
    ("vestido-maria-julia", "Vestido Maria Júlia", "", "Vestido", "139,90", "2:1 4:1 6:1", [2]),
    ("bata-anthony", "Bata Anthony", "", "Bata", "59,90", "2:1 4:1", [3]),
    ("vestido-ester", "Vestido Ester", "", "Vestido", "139,90", "2:1 4:1 6:1", [4]),
    ("conjunto-joab", "Conjunto Joab", "", "Conjunto", "89,90", "2:1 4:1 6:1", [5]),
    ("vestido-clara-cru", "Vestido Clara", "Cru", "Vestido", "129,90", "1:1 2:1 6:1", [6]),
    ("vestido-clara-safira", "Vestido Clara", "Safira", "Vestido", "129,90", "2:1 4:1 6:1", []),  # sem foto própria (a do PDF é da cor Cru): a vendedora envia pelo formulário
    ("conjunto-joao-gabriel", "Conjunto João Gabriel", "", "Conjunto", "75,90", "2:2 6:2", [7]),
    ("conjunto-flor", "Conjunto Flor", "", "Conjunto", "88,90", "1:1 4:1 6:1", [8]),
    ("conjunto-happy-arthur", "Conjunto Happy Arthur", "", "Conjunto", "95,90", "2:1 4:1 6:2", [9, 10]),
    ("conjunto-helena", "Conjunto Helena", "", "Conjunto", "88,90", "2:1 4:1 6:1", [11]),
    ("conjunto-doguinho", "Conjunto Doguinho", "", "Conjunto", "109,90", "2:1 4:2 6:2", [12]),
    ("jardineira-antonella", "Jardineira Antonella", "", "Jardineira", "119,90", "2:2 3:1", [13, 14]),
    ("shorts-linho-castanho", "Shorts Linho Castanho", "", "Shorts", "45,90", "6:2", [15]),
    ("camisa-arthur", "Camisa Arthur", "", "Camisa", "49,90", "2:2 4:2 6:2", [16]),
    ("short-moletinho", "Short Moletinho", "", "Shorts", "45,50", "2:2 4:2", [17]),
]
DESTAQUES = 9  # as 9 primeiras linhas (8 peças, o Vestido Clara ocupa 2)

CONFIG = [["chave", "valor"], ["desconto_campanha", "10"], ["aviso_topo", ""]]
MARCA = "[texto provisório — a Anne substitui na planilha]"
CAMPANHA = [
    [f"{MARCA} Doe uma peça infantil em bom estado e ajude outra família a vestir a infância com carinho."],
    [f"{MARCA} Quem doa ganha 10% de desconto nas peças participantes da campanha Trio Kids Abraça."],
    [f"{MARCA} A entrega da doação é combinada pelo WhatsApp, no melhor horário para você."],
]


def fotos_da_pagina(doc, numero):
    """Imagens embutidas da página (1-based) com lado maior >= 500 px, sem repetir xref."""
    vistos, saida = set(), []
    for img in doc[numero - 1].get_images(full=True):
        xref, w, h = img[0], img[2], img[3]
        if xref in vistos or max(w, h) < LADO_MIN:
            continue
        vistos.add(xref)
        saida.append(xref)
    return saida


def para_jpeg(doc, xref, destino):
    pix = fitz.Pixmap(doc, xref)
    if pix.alpha or pix.colorspace is None or pix.colorspace.n != 3:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    im = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    im.thumbnail((LADO_MAX, LADO_MAX), Image.LANCZOS)
    im.save(destino, "JPEG", quality=QUALIDADE, optimize=True)


def escrever_csv(caminho, linhas):
    with open(caminho, "w", encoding="utf-8", newline="") as f:
        csv.writer(f, lineterminator="\n").writerows(linhas)


def main(caminho_pdf):
    doc = fitz.open(caminho_pdf)
    (RAIZ / "fotos").mkdir(exist_ok=True)
    (RAIZ / "img").mkdir(exist_ok=True)
    (RAIZ / "dados-iniciais").mkdir(exist_ok=True)

    linhas = [COLUNAS]
    for i, (codigo, nome, cor, categoria, preco, estoque, paginas) in enumerate(PECAS):
        xrefs = [x for p in paginas for x in fotos_da_pagina(doc, p)]
        for n, xref in enumerate(xrefs, 1):
            para_jpeg(doc, xref, RAIZ / "fotos" / f"{codigo}-{n}.jpg")
        tam = dict(par.split(":") for par in estoque.split())
        linha = {"codigo": codigo, "nome": nome, "cor": cor, "categoria": categoria,
                 "colecao": "Linha Petit", "preco": preco, "ativo": "sim",
                 "destaque": "sim" if i < DESTAQUES else "", "campanha": "sim",
                 "fotos": str(len(xrefs)), "descricao": ""}
        linha.update(tam)
        linhas.append([linha.get(c, "") for c in COLUNAS])
        print(f"{codigo}: {len(xrefs)} foto(s)")

    # Logo: imagem da página 1 que contém o cabide (a primeira, no topo).
    topo = min(doc[0].get_image_info(xrefs=True), key=lambda i: i["bbox"][1])
    pix = fitz.Pixmap(doc, topo["xref"])
    if pix.colorspace is None or pix.colorspace.n != 3 or pix.alpha:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    logo = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    logo.thumbnail((600, 600), Image.LANCZOS)
    logo.save(RAIZ / "img" / "logo.png", optimize=True)

    escrever_csv(RAIZ / "dados-iniciais" / "pecas.csv", linhas)
    escrever_csv(RAIZ / "dados-iniciais" / "config.csv", CONFIG)
    escrever_csv(RAIZ / "dados-iniciais" / "campanha.csv", CAMPANHA)
    catalogo = {"geradoEm": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "pecas": linhas, "config": CONFIG, "campanha": CAMPANHA}
    (RAIZ / "catalogo.json").write_text(json.dumps(catalogo, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
