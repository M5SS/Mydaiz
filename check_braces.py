
with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

range_lines = lines[166:1043] # App start to end (0-indexed)
content = "".join(range_lines)

# Basic balance check
stack = []
for i, char in enumerate(content):
    if char == '{':
        stack.append(('{', i))
    elif char == '}':
        if not stack or stack[-1][0] != '{':
            print(f"Mismatched }} at position {i}")
            # print surrounding context
            start = max(0, i-20)
            end = min(len(content), i+20)
            print(f"Context: {content[start:end]}")
        else:
            stack.pop()

if stack:
    print(f"Unclosed braces: {len(stack)}")
    for s in stack[:5]:
        pos = s[1]
        print(f"Unclosed {{ at position {pos}")
        start = max(0, pos-20)
        end = min(len(content), pos+20)
        print(f"Context: {content[start:end]}")
else:
    print("Braces are balanced!")
