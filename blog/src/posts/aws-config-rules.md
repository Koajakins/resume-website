---
title: "AWS Config rules, conformance packs, and the operational details that matter"
date: 2026-05-22
updated: 2026-06-09
excerpt: "A practitioner-focused look at AWS Config rule types, evaluation mechanics, conformance pack deployment, and the cost and correctness traps that catch teams off guard."
eleventyExcludeFromCollections: true
noindex: true
---

AWS Config evaluates resource configurations against rules you define, recording compliance state as a time-series alongside configuration history. It is a continuous assessment system, not a real-time enforcement layer. That distinction matters when you are deciding what to build on top of it.

## Rule types and when each applies

Config rules come in four categories: managed, custom Lambda, custom Guard (policy-as-code using AWS CloudFormation Guard), and service-linked rules created by other AWS services on your behalf. Organizational rules are a deployment scope, not a separate rule type.

Managed rules cover the most common controls and come with predefined parameter defaults. Those defaults only populate in the console. If you deploy via CLI, API, or SDK, you supply all parameter values yourself. Teams that automate rule deployment without auditing what the managed rule actually requires hit this regularly.

Custom Lambda rules give you full flexibility but carry two non-obvious operational requirements. First, scope the rule to explicit resource types. An unscoped custom Lambda rule invokes the function for every resource in the account. In a large account, that invocation count adds up fast and you will hit throttling before the cost is obvious. Second, return `NOT_APPLICABLE` for deleted resources. If you skip this, evaluation results for deleted resources persist unchanged until you delete the rule. When you do delete it, Config creates CIs for `AWS::Config::ResourceCompliance` for every stale result — a sudden spike in recorded CIs that shows up directly in your bill.

## How evaluation triggering works

Rules evaluate on two trigger types: configuration changes and periodic.

Change-triggered rules run when Config detects a change to a resource in the rule's scope. Config records configuration changes on a best-effort basis; the documentation explicitly notes that recording can lag, with `AWS::SecretsManager::Secret` cited as a known example. Don't architect compliance workflows that assume sub-minute detection latency.

Periodic rules run on a schedule: 1, 3, 6, 12, or 24 hours. There is an interaction between periodic rules and global IAM resource types that catches people. If you record a global IAM resource type in at least one region, a periodic rule targeting that resource type runs evaluations in every region where the periodic rule is deployed, regardless of whether that region actually records the resource type. The fix is to deploy periodic rules covering global IAM resources to exactly one supported region.

The global IAM resource types affected are `AWS::IAM::Group`, `AWS::IAM::Policy`, `AWS::IAM::Role`, and `AWS::IAM::User`. These can only be recorded in regions where Config was available before February 2022.

## Proactive evaluation

Config also supports proactive evaluation, which checks resources before they are provisioned. You enable this per rule. It's useful for catching non-compliant infrastructure in CI/CD pipelines via the `StartResourceEvaluation` API before a CloudFormation stack or Terraform plan actually applies.

## A concrete evaluation result

The finding structure below is representative of what Config returns for a non-compliant resource evaluation:

```json
{
  "EvaluationResultIdentifier": {
    "EvaluationResultQualifier": {
      "ConfigRuleName": "s3-bucket-public-read-prohibited",
      "ResourceType": "AWS::S3::Bucket",
      "ResourceId": "my-example-bucket",
      "EvaluationMode": "DETECTIVE"
    },
    "OrderingTimestamp": "2026-04-10T14:32:01.000Z"
  },
  "ComplianceType": "NON_COMPLIANT",
  "ResultRecordedTime": "2026-04-10T14:32:45.000Z",
  "ConfigRuleInvokedTime": "2026-04-10T14:32:10.000Z",
  "Annotation": "Bucket allows public read access via ACL.",
  "ResultToken": "myResultToken"
}
```

Key fields to note:
- `EvaluationMode`: distinguishes `DETECTIVE` (after-the-fact) from `PROACTIVE` (pre-provisioning) results; the same rule can produce both types.
- `OrderingTimestamp`: the time of the configuration change that triggered evaluation, not the time the evaluation completed. Use this for sequencing when correlating with CloudTrail.
- `ConfigRuleInvokedTime` vs `ResultRecordedTime`: the delta reveals evaluation processing latency for the specific rule.
- `Annotation`: free-text field populated by the rule logic. For managed rules, AWS sets this; for custom rules, your Lambda or Guard policy controls the content. Make it useful.
- `ComplianceType`: possible values are `COMPLIANT`, `NON_COMPLIANT`, `NOT_APPLICABLE`, and `INSUFFICIENT_DATA`. `INSUFFICIENT_DATA` means the rule hasn't gathered enough information yet, not that the resource is compliant.

## Conformance packs

A conformance pack bundles multiple Config rules and optional remediation actions into a single deployable YAML template. You can deploy a pack to an individual account and region, or push it across an entire AWS Organization from the management account or a delegated administrator account.

The YAML template references either managed rule identifiers or custom rule Lambda ARNs, with parameters. You can also store conformance pack templates as SSM documents and deploy by document name, which suits teams that manage configuration templates through Systems Manager.

Compliance visibility works at two levels: individual rule results, and an aggregate conformance pack compliance score reflecting the percentage of rules with at least one compliant resource. The dashboard surfaces both.

## Custom rules vs. managed rules: key operational differences

| Dimension | Managed rules | Custom Lambda rules |
|---|---|---|
| Parameter defaults in console | Pre-populated | None; you define all inputs |
| Parameter defaults via CLI/API | Not supplied | Not supplied |
| Scope requirement | Defined by AWS | Must be specified; unscoped = all resources |
| Deleted resource handling | Handled by AWS | Requires explicit `NOT_APPLICABLE` logic in your function |
| Update cadence | AWS controls | You own the function code |
| S3 directory bucket support | Not supported (general purpose only) | Depends on your implementation |
| Cost risk on rule deletion | Standard | High if deleted resources not marked `NOT_APPLICABLE` |

## Cost considerations when deleting rules

Deleting a Config rule is asynchronous and can take an hour or more. During deletion, Config creates CIs for `AWS::Config::ResourceCompliance` for each affected resource. If a rule evaluates a large number of resources, the CI volume spike translates directly to recording costs.

One mitigation: disable recording for `AWS::Config::ResourceCompliance` before deleting rules, then re-enable it after deletion completes. The tradeoff is that while recording is disabled, rule evaluations don't appear in resource history. That gap affects audit trails and any downstream process reading compliance history. Whether that's acceptable depends on your specific rule and resource count.

## Sending results to Security Hub

Config rules can send evaluation results to Security Hub's CSPM capability, converting non-compliance events into Security Hub findings. From there, they go through the same triage and workflow as any other security finding. Security Hub must be enabled in the same account and region and configured to accept findings from Config.

## Further reading

- [Evaluating resources with AWS Config rules](https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config.html)
- [Conformance packs for AWS Config](https://docs.aws.amazon.com/config/latest/developerguide/conformance-packs.html)
- [AWS Config managed rules](https://docs.aws.amazon.com/config/latest/developerguide/managed-rules-by-aws-config.html)
- [AWS Config custom Lambda rules](https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config_develop-rules_lambda-functions.html)
- [Proactive evaluation with AWS Config](https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config-rules.html)
- [Managing organizational conformance packs](https://docs.aws.amazon.com/config/latest/developerguide/conformance-pack-organization-apis.html)
