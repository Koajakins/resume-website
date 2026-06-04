import json
import os
import re
import urllib.request

token = os.environ["LINKEDIN_ACCESS_TOKEN"]
post_file = os.environ["POST_FILE"]

with open(post_file, encoding="utf-8") as f:
    content = f.read()

title = re.search(r'^title:\s*"?(.+?)"?\s*$', content, re.MULTILINE)
excerpt = re.search(r'^excerpt:\s*"?(.+?)"?\s*$', content, re.MULTILINE)
linkedin = re.search(r'^linkedin:\s*\|\n((?:[ \t]+.*\n?)*)', content, re.MULTILINE)

title = title.group(1) if title else ""
excerpt = excerpt.group(1) if excerpt else ""

slug = os.path.splitext(os.path.basename(post_file))[0]
url = f"https://www.haggath.re/blog/{slug}/"

if linkedin:
    body = re.sub(r'^[ \t]+', '', linkedin.group(1), flags=re.MULTILINE).strip()
    text = f"{body}\n\n{url}"
else:
    text = f"{title}\n\n{excerpt}\n\n{url}\n\n#AWSsecurity #CloudSecurity #AWS"

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
with urllib.request.urlopen(req) as r:
    print(r.read().decode())
