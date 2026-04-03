"""
PepTalk Knowledge Base Ingestion Script

Reads all markdown files from data/, embeds them using the local
sentence-transformer model, and stores them in ChromaDB.

Run once to build the vector database. Re-run if data files change.

Usage:
    cd backend
    source .venv/bin/activate
    python ingest.py
"""

import os
import time
import chromadb
from sentence_transformers import SentenceTransformer

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data")
MODEL_PATH = os.path.join(SCRIPT_DIR, "models", "all-MiniLM-L6-v2")
CHROMA_PATH = os.path.join(SCRIPT_DIR, "chroma_db")

# Category detection based on top-level directory
CATEGORIES = {
    "peptides": "peptide",
    "supplements": "supplement",
    "lifestyle": "lifestyle",
}


def get_metadata(filepath: str) -> dict:
    """Extract metadata from a file's path within the data directory."""
    rel_path = os.path.relpath(filepath, DATA_DIR)
    parts = rel_path.split(os.sep)

    # Top-level category: peptides, supplements, or lifestyle
    top_dir = parts[0] if parts else "unknown"
    category = CATEGORIES.get(top_dir, "guide")

    # Item name (peptide/supplement/topic directory)
    item = parts[1] if len(parts) > 2 else "general"

    # Section name from filename
    section = os.path.splitext(parts[-1])[0] if parts else "unknown"

    # Check if it's a guide file (starts with _)
    if item.startswith("_"):
        category = "guide"

    return {
        "category": category,
        "item": item,
        "section": section,
        "source": rel_path,
    }


def load_documents(data_dir: str) -> list[dict]:
    """Walk the data directory and load all markdown files with metadata."""
    documents = []

    for root, dirs, files in os.walk(data_dir):
        for filename in files:
            if not filename.endswith(".md"):
                continue

            filepath = os.path.join(root, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read().strip()

            if not content:
                continue

            metadata = get_metadata(filepath)
            documents.append(
                {
                    "id": metadata["source"],
                    "content": content,
                    "metadata": metadata,
                }
            )

    return documents


def main():
    print("PepTalk Knowledge Base Ingestion")
    print("=" * 40)

    # Load the embedding model
    print(f"\nLoading embedding model from {MODEL_PATH}...")
    start = time.time()
    model = SentenceTransformer(MODEL_PATH)
    print(f"Model loaded in {time.time() - start:.1f}s")

    # Load all documents
    print(f"\nReading documents from {DATA_DIR}...")
    documents = load_documents(DATA_DIR)
    print(f"Found {len(documents)} documents")

    # Show breakdown
    categories = {}
    for doc in documents:
        cat = doc["metadata"]["category"]
        categories[cat] = categories.get(cat, 0) + 1
    for cat, count in sorted(categories.items()):
        print(f"  {cat}: {count}")

    # Generate embeddings
    print(f"\nGenerating embeddings...")
    start = time.time()
    contents = [doc["content"] for doc in documents]
    embeddings = model.encode(contents, show_progress_bar=True, batch_size=64)
    print(f"Embedded {len(documents)} documents in {time.time() - start:.1f}s")

    # Store in ChromaDB
    print(f"\nStoring in ChromaDB at {CHROMA_PATH}...")
    if os.path.exists(CHROMA_PATH):
        import shutil

        shutil.rmtree(CHROMA_PATH)
        print("  Cleared existing database")

    client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = client.create_collection(
        name="peptalk",
        metadata={"hnsw:space": "cosine"},
    )

    # ChromaDB expects lists
    collection.add(
        ids=[doc["id"] for doc in documents],
        embeddings=[emb.tolist() for emb in embeddings],
        documents=[doc["content"] for doc in documents],
        metadatas=[doc["metadata"] for doc in documents],
    )

    print(f"Stored {collection.count()} documents in ChromaDB")

    # Quick test query
    print("\n" + "=" * 40)
    print("Test query: 'what foods should I eat on semaglutide?'")
    query_embedding = model.encode("what foods should I eat on semaglutide?")
    results = collection.query(
        query_embeddings=[query_embedding.tolist()],
        n_results=5,
    )

    print("\nTop 5 results:")
    for i, (doc_id, distance) in enumerate(
        zip(results["ids"][0], results["distances"][0])
    ):
        similarity = 1 - distance  # cosine distance → similarity
        print(f"  {i + 1}. [{similarity:.3f}] {doc_id}")

    print("\nIngestion complete!")


if __name__ == "__main__":
    main()
