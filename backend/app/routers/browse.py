"""Browse endpoints — list and view peptides, supplements, and lifestyle topics."""

import os
import re

from fastapi import APIRouter, HTTPException

from app.config import DATA_DIR

router = APIRouter()

# Map URL paths to data directories
CATEGORY_DIRS = {
    "peptides": DATA_DIR / "peptides",
    "supplements": DATA_DIR / "supplements",
    "lifestyle": DATA_DIR / "lifestyle",
}


def extract_name(filepath: str) -> str:
    """Extract the H1 title from a markdown file."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("# "):
                    return line[2:].strip()
    except (FileNotFoundError, UnicodeDecodeError):
        pass
    return ""


def extract_classification(dirpath: str) -> str:
    """Read the classification from a classification.md file."""
    filepath = os.path.join(dirpath, "classification.md")
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        # Find the content after "## Classification"
        match = re.search(r"## Classification\s*\n+(.+?)(\n|$)", content)
        if match:
            return match.group(1).strip()
    except (FileNotFoundError, UnicodeDecodeError):
        pass
    return ""


def list_items(category: str) -> list[dict]:
    """List all items in a category directory."""
    category_dir = CATEGORY_DIRS.get(category)
    if not category_dir or not category_dir.exists():
        return []

    items = []
    for entry in sorted(category_dir.iterdir()):
        if not entry.is_dir():
            continue
        if entry.name.startswith("_"):
            continue  # skip guide directories

        # Get name from overview.md
        name = extract_name(str(entry / "overview.md"))
        if not name:
            # Fallback: title-case the slug
            name = entry.name.replace("-", " ").title()

        classification = extract_classification(str(entry))

        items.append(
            {
                "slug": entry.name,
                "name": name,
                "classification": classification,
            }
        )

    return items


def get_item_detail(category: str, slug: str) -> dict:
    """Read all sections for one item."""
    category_dir = CATEGORY_DIRS.get(category)
    if not category_dir:
        raise HTTPException(status_code=404, detail=f"Category '{category}' not found")

    item_dir = category_dir / slug
    if not item_dir.exists() or not item_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"'{slug}' not found in {category}")

    # Get name from overview
    name = extract_name(str(item_dir / "overview.md"))
    if not name:
        name = slug.replace("-", " ").title()

    # Read all section files
    sections = {}
    for filepath in sorted(item_dir.iterdir()):
        if not filepath.suffix == ".md":
            continue
        section_name = filepath.stem
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read().strip()
        # Remove the H1 header (redundant — it's just the item name)
        content = re.sub(r"^# .+\n+", "", content)
        sections[section_name] = content

    return {"slug": slug, "name": name, "sections": sections}


# List endpoints
@router.get("/peptides")
async def list_peptides():
    return {"items": list_items("peptides")}


@router.get("/supplements")
async def list_supplements():
    return {"items": list_items("supplements")}


@router.get("/lifestyle")
async def list_lifestyle():
    return {"items": list_items("lifestyle")}


# Detail endpoints
@router.get("/peptides/{slug}")
async def get_peptide(slug: str):
    return get_item_detail("peptides", slug)


@router.get("/supplements/{slug}")
async def get_supplement(slug: str):
    return get_item_detail("supplements", slug)


@router.get("/lifestyle/{slug}")
async def get_lifestyle_topic(slug: str):
    return get_item_detail("lifestyle", slug)
