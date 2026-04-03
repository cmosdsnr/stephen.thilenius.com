import re

def count_words():
    with open('formatted_content.txt', 'r') as f:
        content = f.read()
    
    # Extract sa
    sa_match = re.search(r'sa\s*=\s*\[(.*?)\]', content, re.DOTALL)
    if sa_match:
        sa_content = sa_match.group(1)
        # Count words (assuming quoted uppercase words)
        sa_words = re.findall(r'"([A-Z]+)"', sa_content)
        print(f"sa count: {len(sa_words)}")
    else:
        print("sa not found")

    # Extract oa
    # oa starts after sa, looks like , oa = [...]
    oa_match = re.search(r'oa\s*=\s*\[(.*?)\]', content, re.DOTALL)
    if oa_match:
        oa_content = oa_match.group(1)
        oa_words = re.findall(r'"([A-Z]+)"', oa_content)
        print(f"oa count: {len(oa_words)}")
    else:
        print("oa not found")

if __name__ == '__main__':
    count_words()
