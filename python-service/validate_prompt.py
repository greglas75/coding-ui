#!/usr/bin/env python3
"""
Validate system prompt XML file
Run this to verify the prompt is valid and check token count
"""

import xml.etree.ElementTree as ET
from pathlib import Path
import os

# Try to import anthropic for token counting
try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False
    print("⚠️  anthropic package not installed. Install with: pip install anthropic")


def validate_xml(filepath):
    """Validate XML file can be parsed"""
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
        print(f"✅ XML is valid")
        print(f"   Root tag: <{root.tag}>")

        # Count sections
        sections = list(root)
        print(f"   Sections: {len(sections)}")
        for section in sections:
            print(f"     - <{section.tag}>")

        return True
    except ET.ParseError as e:
        print(f"❌ XML parsing error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def count_tokens(filepath):
    """Count tokens using Anthropic API"""
    if not HAS_ANTHROPIC:
        print("\n⚠️  Cannot count tokens without anthropic package")
        return None

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("\n⚠️  ANTHROPIC_API_KEY not set. Cannot count tokens.")
        print("   Set it with: export ANTHROPIC_API_KEY=sk-ant-...")
        return None

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        client = anthropic.Anthropic(api_key=api_key)
        count = client.count_tokens(content)

        print(f"\n📊 Token Count:")
        print(f"   Total: {count} tokens")

        if count > 3000:
            print(f"   ⚠️  Warning: Exceeds 3000 token limit")
        elif count > 2500:
            print(f"   ⚠️  Close to 3000 token limit")
        else:
            print(f"   ✅ Within acceptable range (< 2500)")

        return count

    except Exception as e:
        print(f"\n❌ Error counting tokens: {e}")
        return None


def get_file_size(filepath):
    """Get file size in KB"""
    size_bytes = Path(filepath).stat().st_size
    size_kb = size_bytes / 1024
    print(f"\n📁 File Size: {size_kb:.2f} KB ({size_bytes} bytes)")
    return size_kb


def main():
    prompt_file = Path(__file__).parent / "prompts" / "system_prompt.xml"

    print("=" * 60)
    print("System Prompt Validation")
    print("=" * 60)
    print(f"\nFile: {prompt_file}\n")

    # Check file exists
    if not prompt_file.exists():
        print(f"❌ File not found: {prompt_file}")
        return 1

    # Validate XML
    if not validate_xml(prompt_file):
        return 1

    # Get file size
    get_file_size(prompt_file)

    # Count tokens
    count_tokens(prompt_file)

    print("\n" + "=" * 60)
    print("✅ Validation Complete")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    exit(main())
