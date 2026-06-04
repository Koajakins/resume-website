import json
import os
import re
import urllib.request

token = os.environ["LINKEDIN_ACCESS_TOKEN"]
post_file = os.environ["POST_FILE"]

with open(post_file, encoding="utf-8") as f:
    content = f.read()

# Extract frontmatter block between --- delimiters
fm_match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
fm_text = fm_match.group(1) if fm_match else ""

def fm_scalar(key, text):
    # Block scalar (key: |) — capture until end of frontmatter text
    m = re.search(r'^' + key + r':\s*\|\n([\s\S]*?)(?=\n\S|\Z)', text, re.MULTILINE)
    if m:
        return re.sub(r'^[ \t]{2}', '', m.group(1), flags=re.MULTILINE).strip()
    # Plain / quoted scalar
    m = re.search(r'^' + key + r':\s*"?(.+?)"?\s*$', text, re.MULTILINE)
    return m.group(1) if m else ""

title = fm_scalar("title", fm_text)
excerpt = fm_scalar("excerpt", fm_text)
linkedin = fm_scalar("linkedin", fm_text)

slug = os.path.splitext(os.path.basename(post_file))[0]
url = f"https://www.haggath.re/blog/{slug}/"

if linkedin:
    text = f"{linkedin}\n\nFull post: {url}"
else:
    text = f"{title}\n\n{excerpt}\n\n{url}\n\n#AWSsecurity #CloudSecurity #AWS"

print(f"Post text ({len(text)} chars):\n{text}\n")

req = urllib.request.Request(
    "https://api.linkedin.com/v2/userinfo",
    headers={"Authorization": f"Bearer {token}"},
)
with urllib.request.urlopen(req) as r:
    urn = json.loads(r.read())["sub"]

payload = json.dumps({
    "author": f"urn:li:person:{urn}",
    "lifecycleState": "PUBLISHED",
    "specificContent": {
        "com.linkedin.ugc.ShareContent": {
            "shareCommentary": {"text": text},
            "shareMediaCategory": "NONE",
        }
    },
    "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
}).encode()

req = urllib.request.Request(
    "https://api.linkedin.com/v2/ugcPosts",
    data=payload,
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
    },
)
try:
    with urllib.request.urlopen(req) as r:
        print(r.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}: {e.read().decode()}")
    raise
