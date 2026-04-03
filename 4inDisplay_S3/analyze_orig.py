import re

def analyze_vars():
    with open('orig.txt', 'r') as f:
        content = f.read()
    
    # regex for variable definitions
    # Matches `name = value` where name is sa, ra, Vs, oa, go, cr
    # Since they might be comma separated `let sa = ..., ra = ...`
    
    # 1. sa (Array)
    sa_match = re.search(r'sa\s*=\s*\[(.*?)\]', content, re.DOTALL)
    if sa_match:
        words = re.findall(r'"([A-Z]+)"', sa_match.group(1))
        print(f"sa: {len(words)}")
    else:
        print("sa: not found")

    # 2. ra (String split)
    ra_match = re.search(r'ra\s*=\s*"(.*?)"\.split', content, re.DOTALL)
    if ra_match:
        words = ra_match.group(1).strip().split(' ')
        print(f"ra: {len(words)}")
    else:
        print("ra: not found")

    # 3. Vs (String split)
    Vs_match = re.search(r'Vs\s*=\s*"(.*?)"\.split', content, re.DOTALL)
    if Vs_match:
        words = Vs_match.group(1).strip().split(' ')
        print(f"Vs: {len(words)}")
    else:
        print("Vs: not found")

    # 4. oa (Array)
    oa_match = re.search(r'oa\s*=\s*\[(.*?)\]', content, re.DOTALL)
    if oa_match:
        words = re.findall(r'"([A-Z]+)"', oa_match.group(1))
        print(f"oa: {len(words)}")
    else:
        print("oa: not found")
        
    # 5. go (Set)
    go_match = re.search(r'go\s*=\s*new Set\("(.*?)"', content, re.DOTALL)
    if go_match:
        words = go_match.group(1).strip().split(' ')
        print(f"go: {len(words)}")
    else:
        print("go: not found")

    # 6. cr (Set)
    cr_match = re.search(r'cr\s*=\s*new Set\("(.*?)"', content, re.DOTALL)
    if cr_match:
        words = cr_match.group(1).strip().split(' ')
        print(f"cr: {len(words)}")
    else:
        print("cr: not found")

if __name__ == '__main__':
    analyze_vars()
