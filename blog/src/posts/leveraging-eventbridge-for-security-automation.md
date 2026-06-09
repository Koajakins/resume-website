---
title: "Leveraging Amazon EventBridge to invoke Security Automation"
date: 2026-05-22
updated: 2026-06-09
excerpt: "How to use Amazon EventBridge rules to capture GuardDuty, Macie, and Security Hub events and automatically invoke Lambda, Step Functions, or SSM remediation workflows."
faqs:
  - question: "What is Amazon EventBridge?"
    answer: "Amazon EventBridge is a serverless event bus that receives structured JSON events from AWS services and routes them to targets you define — Lambda functions, Step Functions workflows, SNS topics, and more — based on rules you configure. Every AWS account has a default event bus that AWS services publish to automatically."
  - question: "How does EventBridge enable security automation?"
    answer: "When a security service like GuardDuty generates a finding, it emits a structured JSON event to EventBridge. A rule evaluates the event pattern and, if it matches, invokes up to five targets simultaneously — enabling automated enrichment, ticketing, or remediation in seconds without analyst intervention."
---

GuardDuty identifies threats. Macie surfaces sensitive data exposure. Security Hub aggregates findings across both. None of them act on what they find by default — that part is on you.

Amazon EventBridge is where detection meets response. It captures events emitted by AWS services and routes them to targets you define: Lambda functions, Step Functions workflows, Systems Manager Automation runbooks, SNS topics. It is the layer between a finding being generated and something actually happening because of it.

---

## What is Amazon EventBridge?

[Amazon EventBridge](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html) is a serverless event bus that receives structured JSON events from AWS services and routes them to targets you define — Lambda functions, Step Functions workflows, SNS topics, and more — based on rules you configure.

EventBridge is a serverless event bus. AWS services publish structured JSON events to it when things happen: a GuardDuty finding is generated, an EC2 instance changes state, an IAM policy is modified. EventBridge receives those events on the default event bus and evaluates them against rules you define. Matching events get delivered to your targets.

There are three ways to work with events in EventBridge:

- **Event buses**: receive events from many sources and route them to many targets. Every AWS account has a default event bus that AWS services publish to automatically. You can create custom buses for cross-account routing or your own application events.
- **Pipes**: point-to-point, single source to single target. Useful when you need filtering, enrichment, or transformation in between. Less relevant for security automation at scale.
- **Scheduler**: time-based invocation using cron or rate expressions. Separate from event-driven rules.

For security automation, you'll mostly be working with event buses and rules.

---

## Event-Driven Automation in AWS

Event-driven automation replaces the manual security operations loop — finding, review, ticket, action — with an immediate, rule-driven response triggered the moment a security service emits an event, collapsing detection-to-response time from hours to seconds.

The traditional security operations loop — finding appears, analyst reviews it, ticket gets raised, someone performs a manual action — doesn't hold up in environments with hundreds of accounts and thousands of resources. The volume is too high and the latency is too long.

Event-driven automation collapses that loop. When GuardDuty generates a HIGH severity finding, EventBridge can invoke a response in seconds, before an analyst has even opened the console. The security service emits an event, a rule matches it, a target runs. Each step is independent. The detecting service doesn't know or care what happens downstream.

One rule can have up to five targets. A single event simultaneously notifies an SNS topic, opens a ticket via Lambda, and starts a Step Functions workflow. Each target gets the same event; none of them know about the others.

The basic flow:

1. A security service detects something and emits an event
2. EventBridge receives it on the default event bus
3. A rule evaluates the event against a pattern
4. If it matches, EventBridge invokes one or more targets
5. The target does something

### Automation does not have to mean remediation

Event-driven automation doesn't have to touch anything. It doesn't have to isolate an instance or revoke a credential. Those are valid responses, but they're not always the right first move, and in some environments they're politically difficult to get approved.

A finding is what the detecting service observed, not the full picture. Before taking an action that affects a running workload, it's worth thinking about what you don't know yet.

EventBridge targets can be used purely to gather that context and feed it back into your workflow:

- A GuardDuty finding identifies an EC2 instance by ID. A Lambda function queries the EC2 API, pulls the instance tags, attached IAM role, VPC, and public IP status, then writes all of it back to the Security Hub finding via `BatchUpdateFindings`. The analyst sees a fully enriched finding instead of a raw alert.
- A Macie finding identifies an S3 object containing credentials. Before anything is suppressed or escalated, a Lambda function checks whether the bucket is public, who last modified the object, and whether replication is configured to an external account.
- An IAM Access Analyzer finding flags external access. A Lambda function checks whether the principal being granted access belongs to a known partner account in Parameter Store. If it matches, it's low priority. If it doesn't, it escalates.

In each case the automation runs immediately, nothing in production is touched, and the analyst gets a finding with actual context instead of a raw alert. It's a reasonable place to start if your team isn't ready to auto-remediate yet, and it stays useful after you are — better context means better triage regardless of what happens next.

---

## How EventBridge Captures Security Events

[EventBridge rules](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rules.html) match incoming events using [event patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html) — JSON filters that specify which fields and values must be present — and route matching events to up to five targets simultaneously.

### Event Patterns

Rules match events using event patterns: JSON filters that specify which fields must be present and what values they must hold. EventBridge evaluates every incoming event against every active rule. If the event matches, the rule fires.

You only need to include the fields you want to match on. Fields you omit are ignored.

A rule that captures all GuardDuty findings:

```json
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"]
}
```

A rule scoped to a specific finding type at HIGH severity and above:

```json
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"],
  "detail": {
    "type": ["UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS"],
    "severity": [{ "numeric": [">=", 7] }]
  }
}
```

A rule that captures Security Hub findings with a FAILED compliance status that haven't been triaged yet:

```json
{
  "source": ["aws.securityhub"],
  "detail-type": ["Security Hub Findings - Imported"],
  "detail": {
    "findings": {
      "Compliance": {
        "Status": ["FAILED"]
      },
      "Workflow": {
        "Status": ["NEW"]
      }
    }
  }
}
```

### Event Sources

| Service | Event type | When it fires |
|---|---|---|
| GuardDuty | `GuardDuty Finding` | A new finding is generated or an existing finding is updated |
| Security Hub | `Security Hub Findings - Imported` | A finding is ingested or updated in Security Hub |
| Macie | `Macie Finding` | A new Macie finding is generated |
| CloudTrail | Via `aws.cloudtrail` | API calls matching a configured data event trail |
| IAM Access Analyzer | `Access Analyzer Finding` | A new external access finding is generated |
| Config | `Config Rules Compliance Change` | A resource transitions to NON_COMPLIANT |

### Targets

| Target | What it's good for |
|---|---|
| Lambda | Arbitrary code: enrich findings, call external APIs, modify resources, make decisions |
| Step Functions | Multi-step workflows with branching, retries, and optional human approval |
| Systems Manager Automation | Runbook-based remediation for AWS resource configurations, good for Config compliance findings |
| SNS | Fan-out to email, SMS, HTTP endpoints, on-call paging tools |
| SQS | Queue events for downstream processing at controlled throughput, useful during finding bursts |

Each rule supports up to five targets, all invoked in parallel with the same event.

---

## Example: Automated Response to Credential Exfiltration

[`UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS`](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_finding-types-iam.html#unauthorizedaccess-iam-instancecredentialexfiltrationoutsideaws) fires when EC2 instance credentials are used from outside AWS infrastructure — a high-fidelity indicator with a low false-positive rate that warrants an immediate automated response.

`UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS` fires when EC2 instance credentials are used from outside AWS infrastructure. Instance credentials should never originate outside AWS, so the false positive rate on this one is low.

A response workflow for this finding:

1. EventBridge rule matches on `source: aws.guardduty` and `detail.type: UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS`
2. Rule triggers a Step Functions workflow
3. Step 1: Lambda extracts the affected role ARN from `detail.resource.accessKeyDetails.principalId` and queries the EC2 API for instance tags, environment, and owner
4. Step 2: Lambda writes the enriched context back to the Security Hub finding via `BatchUpdateFindings`
5. Step 3: SNS notifies the security team with the finding detail, enriched context, and a link to the finding in Security Hub
6. Step 4: Lambda attaches an explicit deny-all inline policy to the role via `iam:PutRolePolicy`, blocking further use of any active sessions
7. Step 5: Lambda updates `Workflow.Status` to `NOTIFIED` in Security Hub

Enrichment and notification happen first. Containment is a downstream step, after context has been gathered. The whole sequence runs in under 30 seconds from finding generation.

---

## Further Reading

- [What is Amazon EventBridge?](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html)
- [Amazon EventBridge rules](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rules.html)
- [EventBridge event patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html)
- [EventBridge targets](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-targets.html)
- [GuardDuty EventBridge events](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_cloudwatch.html)
- [Security Hub EventBridge events](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cwe-integration-types.html)
- [Automated response and remediation in Security Hub](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cloudwatch-events.html)
