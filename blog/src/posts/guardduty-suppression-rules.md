---
title: "GuardDuty Suppression Rules: Reduce Alert Noise on AWS"
date: 2026-05-10
excerpt: "How to cut GuardDuty alert noise using suppression rules, trusted IP lists, and threat intel lists — with real-world finding type examples for AWS security teams."
---

## What is GuardDuty?

[Amazon GuardDuty](https://docs.aws.amazon.com/guardduty/latest/ug/what-is-guardduty.html) is a continuous threat detection service that monitors AWS accounts, workloads, and data by analysing CloudTrail events, VPC Flow Logs, and DNS query logs — with no agents or additional software to deploy.

Amazon GuardDuty is a continuous threat detection service that monitors, analyses, and processes data sources and logs across your AWS environment. It uses threat intelligence feeds (such as lists of malicious IP addresses, domains, and file hashes) combined with machine learning models to identify suspicious and potentially malicious activity without requiring you to deploy or manage any additional security software.

When enabled, GuardDuty automatically begins ingesting foundational data sources including AWS CloudTrail management events, VPC Flow Logs, and DNS query logs. Beyond these defaults, GuardDuty offers dedicated protection plans that extend coverage to additional services:

- **EKS Protection**: audits Kubernetes API server logs for your EKS clusters
- **RDS Protection**: monitors login activity for Amazon Aurora databases
- **S3 Protection**: analyses CloudTrail data events for S3 object-level activity
- **Malware Protection**: scans EBS volumes or S3 objects for malicious files
- **Lambda Protection**: inspects network activity from Lambda function invocations
- **Runtime Monitoring**: captures OS-level, network, and file events from EC2, ECS, and EKS workloads

When a potential threat is identified, GuardDuty generates a *finding*: a detailed security alert containing information about the affected resource, the threat actor, and the severity of the activity.

---

## Example GuardDuty Finding Types

[GuardDuty finding types](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_finding-types-active.html) follow the format `ThreatPurpose:ResourceType/ThreatFamilyName`, where the resource type identifies the targeted AWS service and the threat family describes the attack pattern.

Finding types follow the format `ThreatPurpose:ResourceType/ThreatFamilyName`. The resource type in the name tells you which AWS service was targeted. Below are representative examples across the main categories.

### EC2

EC2 findings typically relate to network-level threats observed via VPC Flow Logs and DNS logs.

- `CryptoCurrency:EC2/BitcoinTool.B!DNS`: an EC2 instance is querying a domain associated with cryptocurrency mining pools
- `Trojan:EC2/BlackholeTraffic`: an instance is communicating with an IP address known to be a black-hole used by malware command-and-control infrastructure
- `UnauthorizedAccess:EC2/TorIPCaller`: an EC2 instance is being accessed from a Tor exit node

### IAM

IAM findings use GuardDuty's anomaly detection model to flag unusual API call patterns across CloudTrail management events.

- `UnauthorizedAccess:IAMUser/ConsoleLoginSuccess.B`: a successful console login from an unusual geographic location
- `CredentialAccess:IAMUser/AnomalousBehavior`: an IAM principal is making API calls in a pattern inconsistent with its historical baseline
- `Persistence:IAMUser/UserPermissions`: an IAM entity is modifying policies or creating new users in a manner consistent with persistence techniques

### S3

S3 findings surface data-access threats against your buckets.

- `Policy:S3/BucketPublicAccessGranted`: an IAM principal has disabled block-public-access settings on a bucket
- `Exfiltration:S3/MaliciousIPCaller`: S3 API calls are being made from a known malicious IP address
- `Discovery:S3/MaliciousIPCaller.Custom`: a source IP on your custom threat list is enumerating S3 buckets

### EKS

EKS Protection findings come from Kubernetes audit log analysis.

- `CredentialAccess:Kubernetes/MaliciousIPCaller`: a Kubernetes API call to retrieve secrets was made from a known malicious IP
- `Execution:Kubernetes/ExecInKubernetes`: a command was executed inside a running container via `kubectl exec`
- `PrivilegeEscalation:Kubernetes/PrivilegedContainer`: a privileged container was launched, which could allow a breakout to the underlying host

### RDS

RDS Protection findings are generated from login activity to Amazon Aurora clusters.

- `CredentialAccess:RDS/AnomalousBehavior.SuccessfulLogin`: a successful database login from an unusual user or location
- `CredentialAccess:RDS/MaliciousIPCaller.FailedLogin`: failed login attempts originating from a known malicious IP address

### Attack Sequences (Extended Threat Detection)

GuardDuty's Extended Threat Detection correlates findings across multiple services and time windows to surface multi-stage attacks as a single high-severity finding.

- `AttackSequence:IAM/CompromisedCredentials`: a sequence of IAM events indicating credential compromise and subsequent lateral movement
- `AttackSequence:S3/CompromisedData`: a chain of events suggesting S3 data was discovered and then exfiltrated
- `AttackSequence:EKS/CompromisedCluster`: correlated signals pointing to a compromised Kubernetes cluster

---

## What are Suppression Rules?

A [GuardDuty suppression rule](https://docs.aws.amazon.com/guardduty/latest/ug/findings_suppression-rule.html) is a filter that automatically archives matching findings — silencing known-good activity without deleting the record. Suppressed findings are stored for 90 days and excluded from Security Hub, EventBridge, and S3 exports.

A suppression rule is a filter you define in GuardDuty that automatically **archives** any new finding that matches its criteria. Suppressed findings are never deleted. GuardDuty still generates them and stores them for 90 days, but they are immediately moved to the archived state and do not appear in your active findings queue.

### How they work

You define a suppression rule using one or more filter attributes (finding type, severity, resource tags, EC2 instance ID, S3 bucket name, etc.) combined with match operators:

| Operator | Behaviour |
|---|---|
| `Equals` / `NotEquals` | Exact match or exclusion |
| `Matches` / `NotMatches` | Wildcard pattern match |
| `GreaterThan` / `LessThan` | Numeric comparison (e.g. severity score) |

Rules can be as broad as suppressing an entire finding type (e.g. all `CryptoCurrency:EC2/*` findings) or as granular as suppressing a specific finding type only when it fires against a resource tagged `Environment: dev`.

### Why use them?

In a mature AWS environment, certain findings will reliably represent known-good activity: a penetration testing EC2 instance that legitimately communicates over unusual ports, a NAT gateway that generates high-volume DNS findings, or a deployment pipeline that makes bulk S3 API calls. Without suppression rules, these recurring false positives dilute your signal-to-noise ratio and increase alert fatigue.

Suppressed findings are also **excluded from downstream integrations** and are not forwarded to AWS Security Hub, Amazon EventBridge, Amazon Detective, or Amazon S3 exports. This means your SIEM, ticketing system, or on-call paging tool stays quiet for findings you have already triaged and accepted.

### Important caveat

GuardDuty's Extended Threat Detection relies on individual findings as signals when building attack sequences. Broadly suppressing finding types can prevent attack sequence findings from being generated, because the archived signals are excluded from correlation. Suppress at the most specific level you can; prefer resource-scoped rules over type-wide ones.

---

## GuardDuty IP Sets

[GuardDuty IP sets and entity lists](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_upload-lists.html) let you upload custom IP addresses or domains to either suppress findings from trusted sources or generate findings for known-malicious sources that AWS's built-in feeds may not yet include.

GuardDuty lets you upload custom lists of IP addresses (and domains) to fine-tune its detection behaviour. These lists come in two flavours: **Trusted IP lists** and **Threat Intel lists** (also called threat lists), described below.

Both are stored as plain-text files in S3 (one entry per line, supporting CIDR notation for IP ranges) and activated per GuardDuty detector. GuardDuty now recommends using **entity lists**, which can contain IP addresses, domain names, or both in the same list, over the legacy IP-only format.

### Trusted IP Lists

A trusted IP list contains IP addresses or CIDR ranges that you consider safe sources of traffic, such as your corporate VPN egress IPs, an office network, or a known third-party security scanner you have authorised. GuardDuty **does not generate findings** for activity originating from entries on a trusted IP list.

Trusted lists are useful when you have infrastructure that legitimately behaves in ways that would otherwise trigger findings, and you want to suppress an entire source rather than write individual suppression rules per finding type.

### Threat Intel Lists

A threat intel list contains IP addresses or domains you have identified as known malicious sources, such as IP ranges from your own incident response investigations or feeds from a commercial threat intelligence provider. When GuardDuty observes activity involving an entry on a threat list, it **generates a finding** even if that IP would not otherwise have triggered one.

Threat lists let you operationalise your own threat intelligence and ensure GuardDuty alerts on adversary infrastructure that AWS's built-in feeds may not yet include.

#### Limits

- Up to **6 trusted IP lists** and **6 threat intel lists** per GuardDuty detector per region
- Maximum **200,000 entries** per list (IP addresses or CIDRs)
- Lists must be stored in S3 and the GuardDuty service role must have `s3:GetObject` permission on the bucket

---

## The Difference Between Trusted Lists and Suppression Rules

Trusted IP lists prevent findings from being generated at all; suppression rules generate the finding and then immediately archive it. The key practical difference is the audit trail — suppressed findings are stored and queryable for 90 days, while trusted-list activity leaves no finding record.

Both trusted lists and suppression rules can silence GuardDuty findings for known-good activity, but they operate at different layers and have meaningfully different behaviours.

| | Trusted IP / Entity Lists | Suppression Rules |
|---|---|---|
| **Scope** | Source IP address or domain | Any finding attribute (type, severity, resource, tags, account, etc.) |
| **Mechanism** | Prevents the finding from being **generated** | Generates the finding, then immediately **archives** it |
| **Finding stored?** | No (the finding is never created) | Yes - archived for 90 days, fully queryable |
| **Attack sequence impact** | No signal created, so no correlation possible | Archived signals are excluded from correlation |
| **Downstream forwarding** | N/A (nothing to forward) | Suppressed findings are not sent to Security Hub, EventBridge, or S3 exports |
| **Granularity** | IP/domain only | Fine-grained: combine multiple attributes with AND logic |
| **Best used for** | Trusted infrastructure sources you always want to ignore | Known false positives scoped by resource, tag, region, or finding subtype |

#### When to use each

Use a **trusted IP list** when the noise originates from a specific, stable set of IP addresses you fully control or trust: your VPN, a penetration testing host, or an authorised scanner. It is the bluntest instrument but requires no maintenance as new finding types emerge.

Use a **suppression rule** when you need more precision: for example, suppressing `CryptoCurrency:EC2/BitcoinTool.B` only for instances tagged `Purpose: mining-research`, while keeping the finding active for all other EC2 instances. Suppression rules also give you the audit trail of archived findings, which trusted lists do not.

In practice, most teams use both: trusted lists for known-good source infrastructure, and suppression rules for finding-type-specific or resource-scoped noise reduction.

---

## Example Finding: IAM Credential Use Outside AWS

[`UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS`](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_finding-types-iam.html#unauthorizedaccess-iam-instancecredentialexfiltrationoutsideaws) is a high-fidelity finding with a low false-positive rate: EC2 instance credentials should never originate from outside AWS infrastructure, so this finding almost always indicates active credential theft.

The finding type `UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS` fires when instance profile credentials (issued via the EC2 metadata service) are used from an IP address that does not belong to AWS infrastructure. This is a high-fidelity indicator of credential theft, since legitimate use of instance credentials should never originate outside of AWS.

```json
{
  "schemaVersion": "2.0",
  "accountId": "123456789012",
  "region": "eu-west-1",
  "partition": "aws",
  "id": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  "arn": "arn:aws:guardduty:eu-west-1:123456789012:detector/abc123def456/finding/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  "type": "UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS",
  "title": "Instance credential used from external IP address not associated with AWS",
  "description": "Credentials created exclusively for EC2 instance i-0abc123def456789a (via role WebAppInstanceRole) were used from external IP address 185.220.101.47, which is not associated with AWS infrastructure.",
  "severity": 8.0,
  "createdAt": "2026-05-10T09:14:32Z",
  "updatedAt": "2026-05-10T09:14:32Z",
  "service": {
    "serviceName": "guardduty",
    "detectorId": "abc123def456",
    "action": {
      "actionType": "AWS_API_CALL",
      "awsApiCallAction": {
        "api": "GetSecretValue",
        "serviceName": "secretsmanager.amazonaws.com",
        "callerType": "Remote IP",
        "remoteIpDetails": {
          "ipAddressV4": "185.220.101.47",
          "organization": {
            "asn": "4244",
            "asnOrg": "Tor Project Exit Node",
            "isp": "Quintex Alliance Consulting",
            "org": "Quintex Alliance Consulting"
          },
          "country": { "countryName": "United States" },
          "city": { "cityName": "Atlanta" },
          "geoLocation": { "lat": 33.749, "lon": -84.388 }
        },
        "affectedResources": {}
      }
    },
    "evidence": {
      "threatIntelligenceDetails": [
        {
          "threatListName": "ProofPoint ET Intelligence",
          "threatNames": ["TorExitNode"]
        }
      ]
    },
    "archived": false,
    "count": 1
  },
  "resource": {
    "resourceType": "AccessKey",
    "accessKeyDetails": {
      "accessKeyId": "ASIAQRSTUVWXYZ123456",
      "principalId": "AROABC123DEF456GHI789:i-0abc123def456789a",
      "userType": "AssumedRole",
      "userName": "WebAppInstanceRole"
    }
  }
}
```

Key fields to note:

- **`type`**: the finding identifier, useful as the primary filter attribute in a suppression rule
- **`severity`**: scored 8.0 (High) on GuardDuty's 1-10 scale; credentials used outside AWS are rarely false positives
- **`service.action.awsApiCallAction.api`**: the specific API call made with the stolen credentials (`GetSecretValue` here indicates the attacker was targeting secrets)
- **`service.action.awsApiCallAction.remoteIpDetails`**: the external IP and enriched geo/ASN data GuardDuty adds automatically
- **`service.evidence.threatIntelligenceDetails`**: shows the credential was used from a known Tor exit node, corroborating the alert
- **`resource.accessKeyDetails.principalId`**: the `AROA...` prefix confirms this is an assumed-role session tied to an EC2 instance, not a long-term IAM user key

---

## Further Reading

- [What is Amazon GuardDuty?](https://docs.aws.amazon.com/guardduty/latest/ug/what-is-guardduty.html)
- [GuardDuty EC2 finding types](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_finding-types-ec2.html)
- [GuardDuty IAM finding types](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_finding-types-iam.html)
- [GuardDuty S3 finding types](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_finding-types-s3.html)
- [GuardDuty EKS finding types](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-finding-types-eks-audit-logs.html)
- [GuardDuty RDS finding types](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-finding-types-rds.html)
- [Suppression rules in GuardDuty](https://docs.aws.amazon.com/guardduty/latest/ug/findings_suppression-rule.html)
- [Customizing threat detection with entity lists and IP address lists](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_upload-lists.html)
