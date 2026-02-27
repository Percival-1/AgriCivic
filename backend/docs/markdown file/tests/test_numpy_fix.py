import numpy as np

print(f"NumPy version: {np.__version__}")
print(f"float_ available before fix: {hasattr(np, 'float_')}")

# Apply the fix
if not hasattr(np, "float_"):
    np.float_ = np.float64
if not hasattr(np, "int_"):
    np.int_ = np.int64
if not hasattr(np, "uint"):
    np.uint = np.uint64

print(f"float_ available after fix: {hasattr(np, 'float_')}")
print(f"int_ available after fix: {hasattr(np, 'int_')}")
print(f"uint available after fix: {hasattr(np, 'uint')}")

print("NumPy compatibility fix applied successfully!")
