"""Product type matching utilities."""

CATEGORY_PRODUCT_TYPES = {
    "Toothpaste": [
        "toothpaste", "paste", "dental cream", "tooth paste",
        "معجون أسنان", "معجون", "pasta de dientes"
    ],
    "Toothbrush": [
        "toothbrush", "brush", "electric toothbrush", "manual brush",
        "فرشاة أسنان", "فرشاة", "cepillo de dientes"
    ],
    "Soap": [
        "soap", "bar soap", "liquid soap", "body wash",
        "صابون", "jabón"
    ],
    "Shampoo": [
        "shampoo", "hair wash", "hair cleanser",
        "شامبو", "champú"
    ],
    "Deodorant": [
        "deodorant", "antiperspirant", "deo",
        "مزيل العرق", "desodorante"
    ]
}

def normalize_product_type(product_type: str) -> str:
    """
    Normalize product type to canonical form.

    Examples:
    - "Electric Toothbrush" → "toothbrush"
    - "Dental Cream" → "toothpaste"
    - "معجون أسنان" → "toothpaste"
    """
    if not product_type:
        return "unknown"

    pt = product_type.lower().strip()

    # Check each category
    for category, keywords in CATEGORY_PRODUCT_TYPES.items():
        if any(keyword.lower() in pt for keyword in keywords):
            return category.lower()

    return pt

def matches_category(product_type: str, user_category: str) -> bool:
    """
    Check if detected product type matches user's category.

    Args:
        product_type: From Vision AI (e.g., "Electric Toothbrush")
        user_category: From user (e.g., "Toothpaste")

    Returns:
        True if types match, False otherwise

    Examples:
        matches_category("Toothpaste", "Toothpaste") → True
        matches_category("Electric Toothbrush", "Toothpaste") → False
        matches_category("معجون أسنان", "Toothpaste") → True
    """
    normalized = normalize_product_type(product_type)
    category_normalized = user_category.lower().strip()

    return normalized == category_normalized
