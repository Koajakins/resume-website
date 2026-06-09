---
title: "AWS Security Hub: ASFF, Severity Normalisation and Cross-Account Aggregation"
date: 2026-05-16
updated: 2026-06-09
excerpt: "How AWS Security Hub normalises findings from GuardDuty, Macie, and 30+ integrations into ASFF — and what the severity normalisation scores actually mean for triage."
faqs:
  - question: "What is AWS Security Hub?"
    answer: "AWS Security Hub is a managed security service that aggregates findings from 30+ integrations including GuardDuty, Macie, and Inspector into a single place, translates them into the Amazon Security Finding Format (ASFF), and provides one API and console to query across all of them. It does not detect threats itself."
  - question: "What is the Amazon Security Finding Format (ASFF)?"
    answer: "The Amazon Security Finding Format (ASFF) is the standardised JSON schema that every Security Hub integration must map its findings to. It gives every finding from every source the same set of fields — including severity, affected resource, finding type, and workflow state — making cross-service querying and filtering possible."
---

If you've enabled GuardDuty and Macie in AWS, you already have two separate consoles generating findings in two different formats with two different severity scales. Add Inspector, Config, and a third-party SIEM integration and the problem compounds quickly. Security Hub exists to solve that.

AWS Security Hub is a managed service that pulls findings from 30+ integrations into a single place, translates them into a common format, and gives you one API and console to query across all of them. It doesn't detect threats itself. It aggregates and normalises what other services detect.

At the centre of that normalisation is the **Amazon Security Finding Format (ASFF)**: a standardised JSON schema that every integrated service must map its findings to before Security Hub will accept them. Every finding, regardless of source, ends up with the same set of fields: severity, affected resource, finding type, workflow state.

Beyond aggregation, Security Hub provides two additional capabilities:

- **Security Hub Controls**: managed compliance checks aligned to standards including CIS AWS Foundations Benchmark, PCI DSS, and AWS Foundational Security Best Practices. Each control is a continuously evaluated rule that generates its own ASFF finding when a resource is non-compliant.
- **Insights**: pre-built and custom groupings of findings, useful for surfacing patterns such as "all HIGH findings by affected account" or "all findings for a specific EC2 instance".

Security Hub must be enabled per account and per region. Integrations with GuardDuty, Macie, Inspector, Config, and IAM Access Analyzer are enabled separately within Security Hub after the service is turned on.

---

## Finding Categories

Security Hub classifies every finding using the [ASFF `Types` field](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-findings-format-type-taxonomy.html) — a three-level `Namespace/Category/Classifier` taxonomy that maps findings from GuardDuty, Macie, Config, and other integrations to a consistent set of threat categories.

Security Hub classifies every finding using the ASFF `Types` field, which follows a three-level namespace taxonomy: `Namespace/Category/Classifier`. A finding can carry multiple `Types` values when it maps to more than one classification.

The five namespaces in use across Security Hub integrations:

| Namespace | What it covers | Example sources |
|---|---|---|
| `Software and Configuration Checks` | Compliance controls, configuration drift, patch status | Security Hub Controls, AWS Config |
| `TTPs` | Threat behaviours aligned to MITRE ATT&CK | GuardDuty, third-party integrations |
| `Sensitive Data Identifications` | Sensitive data discovered in cloud resources | Amazon Macie |
| `Effects` | The impact of a finding: data exposure, resource consumption | GuardDuty, Macie |
| `Unusual Behaviors` | Anomalous activity relative to an established baseline | GuardDuty |

A GuardDuty finding for a console login from an unusual location might carry both `TTPs/Initial Access/Valid Accounts` and `Unusual Behaviors/User/ConsoleLogin`. Two `Types` values reflecting different facets of the same event.

Security Hub Controls findings always fall under `Software and Configuration Checks/Industry and Regulatory Standards` or `Software and Configuration Checks/AWS Security Best Practices`, depending on which standard the control belongs to.

---

## The Amazon Security Finding Format (ASFF)

The [Amazon Security Finding Format (ASFF)](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-findings-format.html) is the standardised JSON schema that every Security Hub integration must map its findings to — giving every finding from every source the same set of fields, including severity, affected resource, finding type, and workflow state.

ASFF is the JSON schema that all Security Hub findings conform to. Every integrated service must translate its native finding format into ASFF before Security Hub will ingest it. This normalisation is what makes cross-service querying and filtering possible.

The key fields:

| Field | Purpose |
|---|---|
| `SchemaVersion` | Always `2018-10-08` |
| `Id` | Unique finding ARN within Security Hub |
| `ProductArn` | ARN of the service that generated the finding: `product/aws/guardduty`, `product/aws/macie`, etc. |
| `GeneratorId` | Product-specific identifier: the GuardDuty detector ARN, the Config rule name, the Security Hub control ID |
| `AwsAccountId` | The account the finding relates to. In a multi-account setup, this is the member account, not the aggregator |
| `Types` | Array of `Namespace/Category/Classifier` strings classifying the finding |
| `CreatedAt` / `UpdatedAt` | ISO 8601 timestamps; `UpdatedAt` reflects when the originating service last updated the finding |
| `Severity.Label` | Normalised severity label: `INFORMATIONAL`, `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL` |
| `Severity.Normalized` | Integer 0-100; the score Security Hub uses to derive `Severity.Label` |
| `FindingProviderFields.Severity` | The original severity from the source product, preserved alongside the normalised ASFF score |
| `Resources` | Array of affected AWS resources, each with `Type`, `Id`, `ARN`, `Region`, and optional `Details` |
| `Compliance` | Present on Security Hub control findings only (contains `Status`: `PASSED`, `FAILED`, `WARNING`, `NOT_AVAILABLE`) |
| `WorkflowState` / `Workflow.Status` | Triage state: `NEW`, `NOTIFIED`, `RESOLVED`, or `SUPPRESSED` |
| `RecordState` | `ACTIVE` or `ARCHIVED`; set by the originating service when a finding is no longer relevant |

The distinction between `RecordState` and `Workflow.Status` trips people up. `RecordState` is controlled by the originating service. GuardDuty sets a finding to `ARCHIVED` when it stops observing the behaviour. `Workflow.Status` is controlled by your team. It reflects where the finding sits in your triage process and is set manually or via Security Hub automation rules. They are independent of each other.

---

## Severity Normalisation

Security Hub [maps every integrated service's native severity scale](https://docs.aws.amazon.com/securityhub/latest/userguide/finding-update-batchimportfindings.html#batchimportfindings-severity) to a `Severity.Normalized` integer between 0 and 100, deriving a common `Severity.Label` — `INFORMATIONAL`, `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL` — that can be compared across GuardDuty, Macie, Inspector, and other sources in a single query.

Every finding ingested by Security Hub is assigned a `Severity.Normalized` score between 0 and 100. This score determines the `Severity.Label` displayed in the console and returned by the API:

| Normalized range | Severity.Label |
|---|---|
| 0 | `INFORMATIONAL` |
| 1-39 | `LOW` |
| 40-69 | `MEDIUM` |
| 70-89 | `HIGH` |
| 90-100 | `CRITICAL` |

Each integrated service maps its own native severity scale to this range. For the three AWS services most commonly used together:

| Service | Native severity | ASFF Normalized | Label |
|---|---|---|---|
| GuardDuty | Low (1.0-3.9) | 1-39 | `LOW` |
| GuardDuty | Medium (4.0-6.9) | 40-69 | `MEDIUM` |
| GuardDuty | High (7.0-8.9) | 70-89 | `HIGH` |
| GuardDuty | Critical (9.0+) | 90-100 | `CRITICAL` |
| Macie | LOW | 1-39 | `LOW` |
| Macie | MEDIUM | 40-69 | `MEDIUM` |
| Macie | HIGH | 70-89 | `HIGH` |
| Inspector | INFORMATIONAL | 0 | `INFORMATIONAL` |
| Inspector | LOW | 1-39 | `LOW` |
| Inspector | MEDIUM | 40-69 | `MEDIUM` |
| Inspector | HIGH | 70-89 | `HIGH` |
| Inspector | CRITICAL | 90-100 | `CRITICAL` |

The normalised score gives you a common severity axis across services. What it doesn't give you is context.

A GuardDuty `HIGH` finding for `UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS` (Normalized: 80) and a Macie `HIGH` finding for `SensitiveData:S3Object/Credentials` (Normalized: 70) both show up as `HIGH` in Security Hub. The first means someone is actively exfiltrating EC2 instance credentials outside AWS. The second means Macie found AWS credentials embedded in an S3 object. Same label, very different urgency.

This is why `ProductArn` and `Types` matter when building filters, suppression rules, or automation. Filtering on `Severity.Label = HIGH` alone surfaces both. Filtering on `ProductArn = product/aws/guardduty` AND `Severity.Label = HIGH` narrows to active threat findings from GuardDuty only.

The original source severity is always available in `FindingProviderFields.Severity.Original`, which preserves the native score (e.g. `"5.0"` for a GuardDuty Medium) alongside the normalised value.

---

## Cross-Account Aggregation

[Security Hub cross-account aggregation](https://docs.aws.amazon.com/securityhub/latest/userguide/finding-aggregation.html) centralises findings from all member accounts into a single administrator account view — one API, one console, one place to query across your entire AWS organisation.

In a multi-account AWS organisation, Security Hub findings are generated locally in each member account. Cross-account aggregation centralises them into a single view without requiring you to log into each account separately.

### Delegated Administrator

One account is designated as the Security Hub delegated administrator via AWS Organizations. Typically this is the security tooling or audit account. Member accounts are enrolled automatically (if auto-enable is configured in Organizations) or manually. Once enrolled, each member account's findings are visible to the administrator account.

The `AwsAccountId` field on each finding identifies the originating member account. In the administrator account's console and API, findings from all members are queryable alongside findings from the administrator account itself.

### Aggregation Region

Security Hub findings are regional by default. Cross-region aggregation must be explicitly configured: one region is designated as the aggregation region, and linked regions forward their findings into it. This gives you a single-region view across both accounts and regions.

The aggregation region must be the same region where your delegated administrator is configured. Regions are linked individually.

### Filtering by Account

When querying aggregated findings, the `AwsAccountId` filter attribute scopes results to specific member accounts. This is useful when a known-noisy account, such as a development sandbox or penetration testing account, generates volume that would otherwise dilute signal from production. You can build Security Hub automation rules that apply `Workflow.Status = SUPPRESSED` to findings from specific accounts matching specific criteria, without affecting the same finding types in other accounts.

---

## Example ASFF Finding

The following [`UnauthorizedAccess:IAMUser/ConsoleLoginSuccess.B`](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_finding-types-iam.html#unauthorizedaccess-iam-consoleloginsuccessb) finding shows how a GuardDuty alert looks after Security Hub normalises it into ASFF — with the original GuardDuty severity preserved in `FindingProviderFields` alongside the normalised score.

The following is a GuardDuty `UnauthorizedAccess:IAMUser/ConsoleLoginSuccess.B` finding as it appears in Security Hub after normalisation, in the format returned by the `GetFindings` API.

```json
{
  "SchemaVersion": "2018-10-08",
  "Id": "arn:aws:securityhub:eu-west-1:123456789012:subscription/guardduty/v1/eu-west-1/123456789012/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  "ProductArn": "arn:aws:securityhub:eu-west-1::product/aws/guardduty",
  "GeneratorId": "arn:aws:guardduty:eu-west-1:123456789012:detector/abc123def456abc123def456abc123de",
  "AwsAccountId": "123456789012",
  "Types": [
    "TTPs/Initial Access/Valid Accounts",
    "Unusual Behaviors/User/ConsoleLogin"
  ],
  "CreatedAt": "2026-05-10T08:42:17Z",
  "UpdatedAt": "2026-05-10T08:42:17Z",
  "Severity": {
    "Label": "MEDIUM",
    "Normalized": 50,
    "Original": "MEDIUM"
  },
  "FindingProviderFields": {
    "Severity": {
      "Label": "MEDIUM",
      "Original": "5.0"
    },
    "Types": [
      "TTPs/Initial Access/Valid Accounts",
      "Unusual Behaviors/User/ConsoleLogin"
    ]
  },
  "Title": "Successful console login from anomalous location.",
  "Description": "AWS Management Console login was observed from an anomalous location. The principal john.doe successfully authenticated from Spain, which is inconsistent with the geographic baseline established for this user.",
  "Resources": [
    {
      "Type": "AwsIamUser",
      "Id": "arn:aws:iam::123456789012:user/john.doe",
      "Partition": "aws",
      "Region": "eu-west-1",
      "Details": {
        "AwsIamUser": {
          "UserName": "john.doe"
        }
      }
    }
  ],
  "WorkflowState": "NEW",
  "Workflow": {
    "Status": "NEW"
  },
  "RecordState": "ACTIVE"
}
```

Key fields to note:

- **`ProductArn`**: `product/aws/guardduty` identifies the originating service. A Macie finding reads `product/aws/macie`; a Security Hub control finding reads `product/aws/securityhub`. This is the primary field for filtering by integration.
- **`GeneratorId`**: the GuardDuty detector ARN. In multi-account environments with multiple detectors, this identifies which detector fired, which is useful when a specific detector is known to generate noise for a particular finding type.
- **`Types`**: dual classification. `TTPs/Initial Access/Valid Accounts` maps to MITRE ATT&CK; `Unusual Behaviors/User/ConsoleLogin` reflects GuardDuty's anomaly detection model. Both are searchable filter attributes in Security Hub.
- **`Severity.Normalized`**: 50, placing this in the `MEDIUM` band (40-69). GuardDuty's native severity of 5.0 maps directly to 50. `FindingProviderFields.Severity.Original` preserves the native `"5.0"` alongside the normalised value.
- **`Compliance`**: absent on threat findings. The field is omitted entirely from the ASFF document, not set to null. Present only on Security Hub control findings, where it carries `Status: PASSED | FAILED | WARNING | NOT_AVAILABLE`.
- **`Workflow.Status`**: `NEW` means the finding hasn't been triaged. Your team or automation rules change this to `RESOLVED` or `SUPPRESSED`. Unlike `RecordState`, this field is yours to manage.
- **`RecordState`**: `ACTIVE` means the finding is current. GuardDuty sets this to `ARCHIVED` when it stops observing the behaviour, independent of your triage state.

---

## Further Reading

- [What is AWS Security Hub?](https://docs.aws.amazon.com/securityhub/latest/userguide/what-is-securityhub.html)
- [Amazon Security Finding Format (ASFF) syntax](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-findings-format.html)
- [ASFF field reference](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-findings-format-attributes.html)
- [Severity normalisation in Security Hub](https://docs.aws.amazon.com/securityhub/latest/userguide/finding-update-batchimportfindings.html#batchimportfindings-severity)
- [Available AWS service integrations](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-internal-providers.html)
- [Designating a Security Hub administrator account](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-accounts-orgs-recommend.html)
- [Configuring finding aggregation across Regions](https://docs.aws.amazon.com/securityhub/latest/userguide/finding-aggregation.html)
