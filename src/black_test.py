"""Module with simple function to validate Black formatting during tests."""

def add_numbers(value_one: int, value_two: int) -> int:
    """Return the sum of two integers."""
    return value_one + value_two


if __name__ == "__main__":
    print(add_numbers(1, 2))
