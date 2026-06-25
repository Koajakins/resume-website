---
title: "Ransomware: encryption mechanics, double extortion, and what defenders actually see"
date: 2026-06-25
excerpt: "A practitioner look at how modern ransomware encrypts data, how double extortion changed the leverage dynamic, and what the attack looks like from logs and telemetry before the ransom note appears."
faqs:
  - question: "What encryption does ransomware use?"
    answer: "Modern ransomware uses a hybrid scheme: a symmetric algorithm (AES-256 in most families) encrypts file contents because it is fast, and an asymmetric algorithm (RSA-2048 or elliptic curve) encrypts the per-session symmetric key. The private half of the asymmetric key pair is held by the attacker, so decryption is not possible without their cooperation unless the key is recovered from memory or a design flaw exists in the implementation."
  - question: "What is double extortion ransomware?"
    answer: "Double extortion ransomware combines file encryption with data theft. Attackers exfiltrate sensitive data before encrypting, then threaten to publish it on a leak site if the ransom is not paid. This pressures victims who might otherwise restore from backup, because restoring files does not prevent exposure of stolen data."
  - question: "How long before ransomware deploys do attackers have access?"
    answer: "Median dwell time before ransomware deployment is measured in days to weeks, not minutes. Attackers typically spend this period on reconnaissance, privilege escalation, disabling backup jobs, and staging data for exfiltration. The encryption event is usually the last thing that happens, not the first."
linkedin: |
  New post in the series on security detection topics: ransomware encryption mechanics, double extortion, and what the attack actually looks like in telemetry before the ransom note appears.

  Encryption is not where defenders have the best opportunity to intervene. By the time files are being encrypted, the attacker has usually been inside for days. The post covers the dwell period: what happens before encryption, what it looks like in logs, and where detection is realistic.

  This post covers:

  - How modern ransomware encrypts data and why decryption without the key is infeasible
  - How double extortion changed the threat model even for organisations with good backups
  - What the pre-encryption phase looks like: reconnaissance, privilege escalation, backup destruction, and staging
  - The telemetry defenders can realistically see: EDR events, log sources, and network signals
  - A representative ransom note and key fields to understand
  - What to look for in Windows event logs, Sysmon, and flow data

  I appreciate any reposts, comments, and discussions. Writing these posts fuels my passion for detection engineering and cloud security monitoring.
---

Modern ransomware operators do not encrypt your files and then disappear. Encryption is the last step. By the time the ransom note appears, the attacker has typically spent days or weeks inside the environment: mapping systems, escalating privileges, exfiltrating data, neutralising recovery options. The cryptography at the end is almost beside the point.

---

## How the encryption works

Most ransomware families use a hybrid encryption scheme. File contents are encrypted with a symmetric algorithm, AES-256 in the majority of contemporary families, because symmetric encryption is fast enough to process thousands of files in minutes. The symmetric key is then encrypted with an asymmetric algorithm, RSA-2048 or an elliptic curve variant, and the attacker holds the private key. The result is that the victim's data is locked under a key that the victim cannot derive, and the key itself is locked under a key only the attacker holds.

The per-session symmetric key is typically generated on the victim machine at runtime, which means it exists in memory briefly before being encrypted and written to disk alongside the encrypted files. Key recovery from memory is occasionally possible immediately after infection, but the window is narrow and requires specific tooling.

Partial encryption is a deliberate design choice in newer families. Encrypting only the first 512KB of a file, or encrypting every other block, allows the ransomware to process a large number of files quickly while still rendering them unrecoverable. The speed advantage matters because most operators want to maximise the encrypted file count before EDR or IR teams can respond.

File extensions are renamed and a ransom note is written to each directory. The ransom note contains a victim-specific identifier (used by the attacker to locate the right decryption key), contact instructions, and typically a payment deadline.

A representative note structure:

```json
{
  "victim_id": "A3F9-7C2B-1E84",
  "contact": "hxxp://[onion-address]/chat/A3F9-7C2B-1E84",
  "deadline_utc": "2026-07-02T00:00:00Z",
  "note": "Your files are encrypted. To recover them, contact us before the deadline.",
  "leak_site": "hxxp://[onion-address]/victims",
  "encrypted_key_blob": "BASE64_ENCODED_RSA_WRAPPED_SESSION_KEY=="
}
```

**Key fields to note:**
- `victim_id`: ties the victim to a specific key held by the attacker; this is what you provide when negotiating
- `encrypted_key_blob`: the session key wrapped with the attacker's RSA public key; without the corresponding private key, this is opaque
- `leak_site`: present in double-extortion operations; the attacker is signalling that data has already left
- `deadline_utc`: creates urgency; operators typically extend it during negotiation, but the clock is real for data publication decisions

---

## Double extortion

Before the Maze group made it standard practice in 2019-2020, ransomware was straightforward: pay or restore from backup. Double extortion changed the leverage calculation.

Attackers now exfiltrate data before encrypting. They publish a portion of the stolen data on a leak site as proof, then threaten to release the rest if the ransom is not paid. This means that an organisation with working backups still faces a disclosure problem. Restoring files does not undo the exfiltration. The ransom becomes as much about preventing data publication as about recovering access.

From a defender's perspective, the exfiltration phase is operationally distinct from the encryption phase, and it leaves different signals. Data leaving the network at volume, to destinations outside normal traffic patterns, in the days before the encryption event is the signature of double extortion staging.

| | Single extortion | Double extortion |
|---|---|---|
| Leverage | File recovery | File recovery + data exposure |
| Backup mitigates | Yes | Partially |
| Detectable pre-encryption | Encryption start | Exfiltration + encryption start |
| Negotiation dynamic | Restore vs. pay | Also includes disclosure risk |
| Affected parties | Victim organisation | Victim + any data subjects in stolen files |

Triple extortion extends this further: DDoS against the victim's infrastructure, or direct contact with the victim's customers or partners, as additional pressure vectors. It is less common but documented.

---

## What happens before the ransom note

Dwell time, the period between initial access and ransomware deployment, is measured in days to weeks for most operations. The pre-encryption activity is where defenders have the most realistic opportunity to intervene.

Initial access arrives via phishing, exploitation of internet-facing services (RDP, VPN appliances, Exchange), or purchase of existing access from initial access brokers. The entry point is often unrelated to the ransomware group conducting the later stages — they buy in.

Reconnaissance follows: network scanning, Active Directory enumeration, identifying file shares and backup systems. The tools are usually legitimate software (Advanced IP Scanner, ADExplorer, BloodHound) and living-off-the-land binaries (net.exe, nltest.exe, dsquery.exe). Legitimate tooling is deliberate; it reduces the detection surface compared to dropping custom malware.

Credential access targets Active Directory. Pass-the-hash, Kerberoasting, and LSASS dumping via Mimikatz or the Task Manager dump method are documented across most major families. The objective is domain admin or equivalent.

Lateral movement uses the harvested credentials over RDP, PsExec, WMI, and scheduled tasks. The attacker moves from the initial foothold to systems containing the data they intend to exfiltrate, and to the domain controllers they will use to push the final payload.

Backup destruction happens before encryption in most operations. VSS shadow copies are deleted (vssadmin.exe delete shadows /all), backup agents are stopped, and in some cases the backup infrastructure is targeted directly. This is the step that makes the ransom note effective; without it, many organisations would simply restore.

Data staging and exfiltration uses rclone, MEGASync, WinSCP, or custom upload utilities. Data is staged in a directory, often ProgramData or a temp path, before transfer. Volumes are large: tens to hundreds of gigabytes to cloud storage endpoints or attacker-controlled servers.

Deployment is last. The ransomware binary is distributed via Group Policy, PsExec, or scheduled tasks, and execution is triggered simultaneously across as many hosts as possible.

---

## What defenders can see

The encryption event itself is hard to stop in real time. EDR products can detect file modification rates exceeding a threshold, but a fast partial-encryption implementation can process thousands of files before the alert fires. Detection is more realistic earlier.

From EDR and endpoint telemetry, the signals to watch:
- LSASS access: `OpenProcess` calls targeting `lsass.exe` from non-standard processes, particularly from injected processes
- VSS deletion: `vssadmin.exe` or `wmic shadowcopy delete` in process creation events
- BloodHound/SharpHound execution: characteristic LDAP queries from non-DC systems, or the binary itself if hashes are known
- Rclone or MEGASync process creation, if not part of the normal baseline
- `net stop` commands targeting backup service names (Veeam, BackupExec, Windows Backup)

From Windows event logs:
- 4624 (successful logon) with logon type 3 (network) from unexpected sources to high-value servers
- 4648 (explicit credential use) during lateral movement
- 4688 (process creation, command line logging required) for reconnaissance tooling
- 7045 (new service installed) for persistence
- 1102 (audit log cleared): attackers clear logs before deployment; this one should always alert

From Sysmon, if deployed:
- Event 1 (process creation) with full command lines: catch `vssadmin`, `wbadmin`, `bcdedit` modifications
- Event 3 (network connection) from staging tools like rclone to known cloud storage IPs
- Event 10 (process access) for LSASS access attempts
- Event 11 (file creation) of ransom note filenames, though if you are seeing this, you are already late

From network telemetry:
- Large outbound transfers to cloud storage endpoints (Mega, Backblaze, generic S3-like targets) outside normal hours
- SMB traffic from a single source to many internal destinations in a short window
- RDP to systems that do not normally accept it, particularly domain controllers
- DNS lookups for known C2 infrastructure if threat intelligence feeds are integrated

The combination that matters most: LSASS access events, followed by VSS deletion, followed by large outbound transfer, is a pre-encryption sequence documented across multiple ransomware families. Each event individually has false positives. The sequence in a short window does not.

---

## Further reading

- [Ransomware: how it works and types](https://www.cloudsek.com/knowledge-base/types-of-ransomware)
- [Double extortion ransomware explained](https://www.vectra.ai/topics/double-extortion)
- [What is double extortion ransomware](https://www.sentinelone.com/cybersecurity-101/threat-intelligence/what-is-double-extortion/)
- [Kaspersky state of ransomware 2026](https://www.cybersecurity-insiders.com/ransomware-in-2026-kaspersky-state-of-ransomware-report/)
- [Microsoft ransomware incident response guidance](https://learn.microsoft.com/en-us/security/operations/incident-response-playbook-ransomware)
- [CISA ransomware guide](https://www.cisa.gov/stopransomware/ransomware-guide)
