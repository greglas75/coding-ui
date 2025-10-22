#!/usr/bin/env python3
"""Quick test of XML parser with the problematic XML file."""
import sys
sys.path.insert(0, '/Users/greglas/coding-ui/python-service')

from services.claude_client import ClaudeClient

# Read the saved XML
xml_file = "/var/folders/3w/_k50hbks3_54pxxy4fxj9f040000gn/T/tmppy0dyre9.xml"
with open(xml_file, 'r') as f:
    xml_text = f.read()

# Initialize client and test parsing
try:
    client = ClaudeClient()
    result = client._parse_xml_response(xml_text)
    print("✅ XML Parsing SUCCESSFUL!")
    print(f"Theme: {result['theme'].name}")
    print(f"Codes: {len(result['codes'])}")
    for i, code in enumerate(result['codes']):
        print(f"  {i+1}. {code.name} ({len(code.sub_codes)} sub-codes)")
        for j, sub in enumerate(code.sub_codes):
            print(f"     {j+1}. {sub.name} - confidence: {sub.confidence}")
except Exception as e:
    print(f"❌ XML Parsing FAILED: {e}")
    import traceback
    traceback.print_exc()
