#!/usr/bin/env python3
"""Test ChromaDB import with NumPy compatibility fix."""

import numpy as np

# Apply NumPy compatibility fix
if not hasattr(np, "float_"):
    np.float_ = np.float64
if not hasattr(np, "int_"):
    np.int_ = np.int64
if not hasattr(np, "uint"):
    np.uint = np.uint64

print("NumPy compatibility fix applied")

try:
    import chromadb

    print("✅ ChromaDB imported successfully")

    # Test basic ChromaDB functionality
    client = chromadb.Client()
    print("✅ ChromaDB client created")

    # Test collection creation
    collection = client.create_collection("test_collection")
    print("✅ Test collection created")

    # Clean up
    client.delete_collection("test_collection")
    print("✅ Test collection deleted")

    print("🎉 ChromaDB is working correctly!")

except Exception as e:
    print(f"❌ ChromaDB test failed: {e}")
    import traceback

    traceback.print_exc()
