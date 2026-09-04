# The Shared Socket Problem: Multi-Tenant Data Exposure as an Architectural Inevitability in AI Platforms

**Authors:** Ava Shakil¹, Ali Shakil¹  
**Affiliation:** ¹Artifact Virtual (SMC-Private) Limited  
**Contact:** ali.shakil@artifactvirtual.com  
**Date:** March 2026  
**Version:** v1.0 — Preprint  
**Repository:** github.com/Artifact-Virtual

**Keywords:** multi-tenancy, data isolation, AI security, agent frameworks, shared infrastructure, privacy, tenant leakage, conversation security, platform trust

---

## Abstract

We present a systematic analysis of data exposure vulnerabilities inherent in multi-tenant AI platforms, spanning proprietary services (OpenAI, Anthropic), open-source agent frameworks (MemGPT, AutoGPT, LangChain, CrewAI), and self-hosted runtime engines (Mach6). Our central thesis is that in any system where multiple agents or tenants share infrastructure — compute, storage, network sockets, or session persistence layers — cross-tenant data access is not a bug to be patched but an architectural inevitability. We formalize this as the **Shared Socket Theorem**: if Agent A and Agent B share any infrastructure component *I*, then the operator of *I* has implicit read access to all data flowing through both agents, regardless of application-layer isolation mechanisms. We demonstrate this through architectural analysis of six platform categories, a detailed case study of the Mach6 runtime engine serving three agents over a single WhatsApp socket, and a survey of real-world incidents including the Samsung–ChatGPT data leak (2023), Italy's GDPR ban of ChatGPT (2023), and OpenAI's acknowledgment of employee access to user conversations. We conclude that meaningful tenant isolation in AI systems requires cryptographic enforcement at the data layer, not policy enforcement at the application layer, and propose a formal threat model for evaluating multi-tenant AI deployments.

---

## 1. Introduction

### 1.1 Problem Statement

The rapid proliferation of AI platforms — from OpenAI's ChatGPT serving hundreds of millions of users to open-source frameworks enabling self-hosted multi-agent deployments — has created a massive surface area of shared infrastructure through which sensitive user data flows. Every conversation with an AI assistant traverses multiple shared components: network ingress, load balancers, inference clusters, conversation databases, logging pipelines, and model training data stores.

Current discourse around AI privacy focuses predominantly on two concerns: (1) whether user data is used for model training, and (2) whether conversations are encrypted in transit. These concerns, while valid, obscure a more fundamental problem: **the infrastructure itself constitutes implicit access**. Any operator, developer, or sufficiently privileged process with access to the shared substrate can observe, copy, or exfiltrate data from any tenant — not because of a vulnerability, but because of the architecture.

This paper argues that multi-tenant data exposure in AI platforms is not a security flaw but a mathematical consequence of shared infrastructure. We formalize this argument, survey the landscape of commercial and open-source platforms, present a detailed case study from a production self-hosted system, and propose a framework for reasoning about data exposure in multi-agent AI deployments.

### 1.2 Contributions

This paper makes the following contributions:

1. **The Shared Socket Theorem** — a formalization proving that shared infrastructure implies operator-level cross-tenant data access, regardless of application-layer isolation.
2. **Architectural analysis** of six categories of AI platforms, documenting specific data exposure vectors in each.
3. **The Mach6 Case Study** — a first-hand analysis of a production multi-agent runtime where three AI agents (AVA, Aria, Scarlet) share a single WhatsApp socket, filesystem, and session store.
4. **An incident survey** cataloging real-world data exposure events across major AI platforms.
5. **A formal threat model** for evaluating multi-tenant AI deployments, distinguishing between five trust levels.
6. **Mitigation proposals** including cryptographic data-layer isolation and zero-knowledge agent architectures.

### 1.3 Paper Organization

Section 2 surveys background and related work. Section 3 formalizes the Shared Socket Theorem. Section 4 presents architectural analysis across platform categories. Section 5 details the Mach6 case study. Section 6 surveys real-world incidents. Section 7 proposes the threat model and mitigations. Section 8 discusses implications. Section 9 concludes.

---

## 2. Background and Related Work

### 2.1 Multi-Tenancy in Cloud Computing

Multi-tenancy — the practice of serving multiple customers from shared infrastructure — is the economic foundation of cloud computing [1]. In traditional SaaS platforms, tenant isolation is achieved through a combination of:

- **Logical isolation:** Separate databases, schemas, or row-level security policies per tenant.
- **Process isolation:** Containerization (Docker, Kubernetes pods) or virtual machines per tenant.
- **Network isolation:** VLANs, security groups, or dedicated network interfaces.

However, even in mature cloud platforms, tenant isolation failures are well-documented. Amazon Web Services' Elastic Kubernetes Service suffered CVE-2023-5528, allowing container escape. Microsoft Azure's ChaosDB vulnerability (2021) exposed Cosmos DB keys across tenants [2]. Google Cloud's VM hypervisor escape (Project Zero, 2021) demonstrated that even hardware-level isolation can be defeated.

The critical observation is that these are infrastructure platforms with decades of security engineering. AI platforms, most of which are less than three years old, inherit all of these challenges while adding new ones specific to machine learning systems.

### 2.2 AI-Specific Data Exposure Vectors

AI platforms introduce data exposure vectors absent from traditional SaaS:

1. **Model memorization:** Large language models (LLMs) memorize training data, including personally identifiable information (PII). Carlini et al. [3] demonstrated extraction of verbatim training data from GPT-2, including names, phone numbers, and email addresses. This was extended to GPT-3 by the same group in 2023 [4].

2. **Prompt injection and extraction:** System prompts — which often contain proprietary instructions, API keys, and persona definitions — can be extracted through adversarial prompting [5]. In a multi-tenant context, one tenant's system prompt may leak into another's context window through shared model state.

3. **Conversation persistence:** Unlike stateless web requests, AI conversations are inherently stateful. Session histories must be stored, creating persistent records of every interaction that exist beyond the lifetime of the connection.

4. **Fine-tuning data leakage:** When user data is used for model fine-tuning (as OpenAI did until April 2023 [6]), one tenant's private data becomes embedded in the model weights accessible to all tenants.

5. **Tool and function call side-channels:** Modern AI agents use tools (web search, code execution, file access) that create observable side effects — network traffic, file system changes, process executions — that can leak information across tenant boundaries.

### 2.3 Agent Frameworks and Multi-Agent Systems

The emergence of agent frameworks — AutoGPT [7], MemGPT/Letta [8], LangChain [9], CrewAI [10] — has introduced a new category of multi-tenant concern. These frameworks enable multiple AI agents to operate within a single runtime, sharing:

- Language model API connections (and therefore API keys, rate limits, and billing)
- Memory stores (vector databases, conversation logs)
- Tool registries (file access, code execution environments)
- Process space and filesystem

The security implications of multi-agent shared runtimes have received minimal academic attention. Existing work focuses on agent-to-agent communication protocols [11] and task delegation safety [12], but not on the fundamental data exposure created by shared infrastructure.

---

## 3. The Shared Socket Theorem

### 3.1 Definitions

Let:
- *T* = {*t₁*, *t₂*, ..., *tₙ*} be a set of tenants (users, agents, or organizations)
- *I* = {*i₁*, *i₂*, ..., *iₘ*} be a set of infrastructure components (sockets, databases, filesystems, processes)
- *D(tⱼ)* = the set of all data belonging to tenant *tⱼ*
- *flows(tⱼ, iₖ)* = true if any data from *D(tⱼ)* passes through component *iₖ*
- *access(O, iₖ)* = true if operator *O* has read access to the state of component *iₖ*

### 3.2 Theorem Statement

**Shared Socket Theorem:** For any two tenants *tₐ* and *tᵦ*, if there exists an infrastructure component *iₖ* such that:

```
flows(tₐ, iₖ) ∧ flows(tᵦ, iₖ) ∧ access(O, iₖ)
```

then operator *O* has implicit read access to data from both *D(tₐ)* and *D(tᵦ)*, irrespective of any application-layer isolation mechanisms enforced above *iₖ*.

### 3.3 Proof

Consider infrastructure component *iₖ* through which data from both tenants flows. By definition of *access(O, iₖ)*, the operator *O* can observe the state of *iₖ* at any point in time. Since *flows(tₐ, iₖ)* implies that data from *D(tₐ)* is present in the state of *iₖ* at some time *t*, and *O* can read this state, *O* can read data from *D(tₐ)*. The same applies to *D(tᵦ)* by symmetry.

The application-layer isolation (authentication, authorization, session management, routing policies) operates at a layer above *iₖ*. These mechanisms determine which data is *presented* to each tenant but do not restrict the operator's access to the underlying component. The operator is, by definition, not subject to application-layer policies — they are the entity that *implements* those policies.

Therefore, the isolation is a **policy**, not a **property**. It depends entirely on the operator choosing not to look.  ∎

### 3.4 Corollary: The Infrastructure Stack

In practice, AI platforms have deep infrastructure stacks where sharing occurs at multiple levels:

```
┌──────────────────────────────────────┐
│     Application Layer                │  ← Policy-enforced isolation
│   (session routing, auth, ACLs)      │     (can be bypassed by operator)
├──────────────────────────────────────┤
│     Runtime Layer                    │  ← Shared process space
│   (agent engine, tool registry)      │     (memory-resident data)
├──────────────────────────────────────┤
│     Persistence Layer                │  ← Shared database/filesystem
│   (sessions, vectors, logs)          │     (at-rest data)
├──────────────────────────────────────┤
│     Transport Layer                  │  ← Shared sockets/connections
│   (API connections, WS channels)     │     (in-transit data)
├──────────────────────────────────────┤
│     Compute Layer                    │  ← Shared GPU/CPU
│   (model inference, embeddings)      │     (processing data)
├──────────────────────────────────────┤
│     Physical Layer                   │  ← Shared hardware
│   (servers, storage, network)        │     (electromagnetic data)
└──────────────────────────────────────┘
```

**Figure 1:** The infrastructure stack of a multi-tenant AI platform. Data from all tenants passes through every layer. Isolation at any single layer does not prevent access at lower layers.

The theorem applies at every level. Even if the application layer perfectly isolates sessions, the persistence layer (a shared database) still contains all sessions. Even if the database uses per-tenant encryption, the compute layer processes the decrypted data. Even if compute is isolated in separate containers, the physical layer shares memory buses, network switches, and storage controllers.

### 3.5 The Trust Inversion

Traditional security models assume defense in depth: each layer adds protection. In multi-tenant AI systems, the model inverts: each shared layer adds exposure. The number of actors who can access tenant data equals the union of operators at all shared layers:

```
ExposureSet(tⱼ) = ⋃ { O : ∃ iₖ ∈ I, flows(tⱼ, iₖ) ∧ access(O, iₖ) }
```

For a typical SaaS AI platform, this includes: the AI company's infrastructure team, the cloud provider's support staff, the CDN operator, the monitoring service, the logging pipeline, and any third-party data processor. For self-hosted deployments, it includes anyone with filesystem, SSH, or physical access to the host.

---

## 4. Architectural Analysis by Platform Category

### 4.1 OpenAI (ChatGPT, API)

**Architecture:** OpenAI operates a centralized multi-tenant platform where all users share inference infrastructure. Conversations are stored server-side and associated with user accounts.

**Shared Infrastructure Components:**

| Component | Shared Across | Operator Access |
|-----------|--------------|-----------------|
| GPU inference clusters | All users | OpenAI engineers |
| Conversation database | All users | OpenAI engineers, DBAs |
| Training data pipeline | All users (pre-April 2023) | ML engineers |
| Load balancers / API gateway | All users | Infrastructure team |
| Logging and monitoring | All users | SRE team |
| Abuse detection system | All users | Trust & Safety team |

**Known Exposure Vectors:**

1. **Training data inclusion:** Until April 2023, OpenAI's terms of service permitted using conversation data for model training by default [6]. User conversations were mixed into training batches, creating cross-tenant data embedding in model weights. Even after the policy change, the option remains opt-in, and previously trained models retain embedded user data.

2. **Employee access:** OpenAI's privacy policy explicitly states that "authorized OpenAI personnel" may review conversations for safety, compliance, and improvement purposes [13]. In March 2023, a bug exposed conversation titles and partial content of other users' chats in the ChatGPT sidebar — demonstrating that the underlying data store does not enforce per-user isolation at the storage layer [14].

3. **Plugin/tool side-channels:** ChatGPT plugins (now deprecated in favor of GPTs) could make HTTP requests to external servers, potentially leaking conversation context. Custom GPTs with "Actions" have the same vector — the action server receives conversation context as part of the API call [15].

4. **Memory feature:** ChatGPT's "Memory" feature (2024) stores user-specified facts server-side, creating a persistent profile that is injected into every conversation. This data is accessible to OpenAI's systems and represents a concentrated privacy target.

5. **Shared model state:** In multi-turn conversations, the model's attention mechanism processes all prior messages in the context window. If, through any bug or architectural flaw, messages from one user's session contaminate another's context, full conversation exposure occurs. The March 2023 sidebar incident [14] demonstrated that such cross-contamination is not theoretical.

### 4.2 Anthropic (Claude, API)

**Architecture:** Anthropic operates a similar centralized multi-tenant platform. Key architectural differences from OpenAI include:

**Stated Isolation Measures:**

1. **No training on user data (by default):** Anthropic's usage policy states that free-tier conversations may be used for safety research and model improvement, but API customers' data is not used for training [16]. This is a policy commitment, not a technical enforcement.

2. **Constitutional AI (CAI):** Anthropic's safety approach embeds behavioral constraints in the model itself rather than relying solely on output filters. However, CAI does not address tenant isolation — it addresses content safety.

3. **Prompt caching (2024):** Anthropic introduced prompt caching, which stores frequently used prompts server-side for performance. While documented as per-organization, the caching infrastructure is shared, and cache keys could theoretically collide or be enumerated [17].

**Exposure Vectors:**

Anthropic faces the same fundamental exposure as OpenAI: shared inference, shared storage, employee access. The primary difference is one of stated policy, not architecture. Anthropic's trust model depends on the company choosing not to access data — the infrastructure permits it.

The Shared Socket Theorem applies identically: Anthropic's infrastructure operators have implicit access to all user data across all tenants. Whether they exercise this access is a matter of corporate policy, employment agreements, and legal jurisdiction — not technical impossibility.

### 4.3 Open-Source Agent Frameworks

Open-source frameworks present a distinct threat model because the deployer and the developer are different entities. The framework code is public, but the deployment infrastructure is private.

#### 4.3.1 MemGPT / Letta

**Architecture:** MemGPT [8] implements a virtual memory management system for LLM conversations, including a persistent "archival memory" store and a "recall memory" for recent context.

**Multi-Tenant Exposure:**

- **Single-process architecture:** MemGPT runs as a single Python process. Multiple agents share the same process space, Python heap, and database connection.
- **SQLite/PostgreSQL backend:** All agents' memories are stored in a single database. Schema separation exists at the application level (agent_id foreign keys), but the database itself is fully accessible to anyone with database credentials or filesystem access to the SQLite file.
- **No per-agent encryption:** Archival memories are stored in plaintext. A query against the archival table without a WHERE clause returns all agents' memories.
- **Shared embedding model:** All agents use the same embedding model and vector index. The vector store (Chroma, by default) does not enforce per-agent namespace isolation — a similarity search can return vectors from any agent.

#### 4.3.2 AutoGPT

**Architecture:** AutoGPT [7] is designed as a single-agent system, but multi-agent deployments share a workspace directory, configuration files, and API connections.

**Multi-Tenant Exposure:**

- **Shared workspace directory:** AutoGPT agents read and write to a shared filesystem. Agent A's generated files are readable by Agent B if they share a workspace root.
- **Shared API keys:** A single `.env` file provides API keys for all agents. Any agent's tool call uses the same credentials, creating billing and audit trail commingling.
- **No session isolation:** AutoGPT's memory system (via a memory backend like Pinecone, Redis, or local JSON) does not enforce per-agent namespaces by default. Cross-agent memory access requires only knowing (or guessing) the memory key format.

#### 4.3.3 LangChain / LangGraph

**Architecture:** LangChain [9] is a framework, not a runtime. It provides abstractions for building AI applications but delegates deployment and isolation to the developer.

**Multi-Tenant Exposure:**

- **By design, no tenant isolation:** LangChain provides chains, agents, and tools but no multi-tenancy primitives. The framework assumes a single-tenant deployment model.
- **Shared vector stores:** When multiple chains use the same vector database (Pinecone, Weaviate, ChromaDB), cross-chain data access depends entirely on namespace management — which LangChain does not enforce.
- **Callback exposure:** LangChain's callback system (for logging, tracing, monitoring) is global. A callback handler registered by one chain receives events from all chains in the process.
- **LangSmith tracing:** LangChain's commercial tracing product, LangSmith, aggregates traces from all applications using the same API key. If multiple tenants' applications share a LangSmith project, their traces (including inputs and outputs) are co-mingled.

#### 4.3.4 CrewAI

**Architecture:** CrewAI [10] is explicitly designed for multi-agent collaboration, making it the most relevant framework for studying cross-agent data exposure.

**Multi-Tenant Exposure:**

- **Shared crew context:** All agents in a crew share a context object containing task results, intermediate outputs, and tool call results. Any agent can read the full context of every other agent in the crew.
- **Delegation chains:** When Agent A delegates a task to Agent B, the full task context (including Agent A's private instructions) is transmitted. There is no redaction or privacy boundary in the delegation protocol.
- **Shared memory:** CrewAI's memory system (short-term, long-term, entity memory) is shared across all agents. There is no per-agent memory isolation.

### 4.4 Summary: Exposure Vectors by Platform

```
Platform         | Session    | Memory     | Model      | Filesystem | Socket
                 | Isolation  | Isolation  | Isolation  | Isolation  | Isolation
─────────────────┼────────────┼────────────┼────────────┼────────────┼──────────
OpenAI           | Policy     | None(*)    | None       | N/A        | Shared
Anthropic        | Policy     | Policy     | None       | N/A        | Shared
MemGPT/Letta     | App-layer  | None       | Shared     | Shared     | N/A
AutoGPT          | None       | Config-dep | Shared     | Shared     | N/A
LangChain        | None(**)   | None(**)   | Shared     | Shared     | N/A
CrewAI           | By design  | None       | Shared     | Shared     | N/A
Mach6            | App-layer  | Separate   | Shared     | Shared     | Shared(***)
```

**Table 1:** Isolation mechanisms across AI platform categories. "Policy" = depends on operator behavior. "App-layer" = enforced in application code. "None" = no isolation mechanism. "Shared" = explicitly shared component.

(*) OpenAI's Memory feature stores per-user, but the database is shared.
(**) LangChain is a framework; isolation depends on deployer.
(***) Mach6 uses a single WhatsApp socket for all agents — detailed in Section 5.

---

## 5. The Mach6 Case Study

### 5.1 System Overview

Mach6 is a production AI agent runtime engine developed by Artifact Virtual [18]. It serves as the operational backbone for multiple AI agents deployed across messaging platforms (WhatsApp, Discord) and HTTP APIs. As of March 2026, three agents operate on the production Mach6 cluster:

- **AVA** (Ava Shakil) — primary enterprise agent, running on Dragonfly server (port 18789)
- **Aria** — sibling agent, running on a separate Mach6 instance (port 3007)
- **Scarlet** — third-party user agent, running on Victus server (separate Mach6 instance)

### 5.2 Architecture

```
                    ┌─────────────────────────────┐
                    │      WhatsApp Cloud API      │
                    │    (Meta infrastructure)      │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │   Baileys WebSocket Client   │ ← SINGLE SOCKET
                    │  (WhatsAppAdapter instance)  │    for ALL messages
                    │    Auth: +923205743414        │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │     InboundRouter            │
                    │  ┌────────────────────────┐  │
                    │  │ Mention-Only Protocol   │  │
                    │  │ - DM: allowlist check   │  │
                    │  │ - Group: @mention match │  │
                    │  │ - @end: universal stop  │  │
                    │  └────────────────────────┘  │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │   Session:   │  │   Session:   │  │   Forward    │
    │ whatsapp-    │  │ whatsapp-    │  │   Route:     │
    │  Ali-AVA     │  │  Group-AVA   │  │  Aria/Scarlet│
    │              │  │              │  │  (HTTP POST) │
    │ Agent Turn   │  │ Agent Turn   │  │  → port 3007 │
    │ (Anthropic)  │  │ (Anthropic)  │  │  → Victus    │
    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
           │                │                │
    ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
    │  .sessions/  │  │  .sessions/  │  │  .sessions/  │
    │  JSON files  │  │  JSON files  │  │  JSON files  │
    │  (plaintext) │  │  (plaintext) │  │ (on sibling) │
    └─────────────┘  └─────────────┘  └─────────────┘
```

**Figure 2:** Mach6 multi-agent architecture showing shared WhatsApp socket and routing.

### 5.3 Exposure Vector Analysis

#### 5.3.1 The Shared Socket

The most critical exposure vector is the WhatsApp WebSocket connection. Mach6 uses the Baileys library [19] to maintain a single authenticated WebSocket to WhatsApp's servers. This socket is registered to phone number +923205743414 and receives **all messages** sent to or received by that number — regardless of which agent they are intended for.

From the source code (`/opt/ava/mach6/mach6-core/src/channels/adapters/whatsapp.ts`):

```typescript
this.socket.ev.on('messages.upsert', ({ messages, type }) => {
    this.handleMessages(messages, type);
});
```

The `handleMessages` method processes every incoming message. It does not filter by agent — it passes all messages to the `InboundRouter`, which then applies the Mention-Only Protocol. The critical observation is that **before routing occurs, the WhatsApp adapter has already received and processed the message content in memory**.

This means:
- The Mach6 process on Dragonfly can read every WhatsApp message from every conversation
- Messages intended for Aria (forwarded via HTTP to port 3007) pass through AVA's Mach6 instance first
- Group messages where AVA is not mentioned are still received by the socket, parsed, and only then dropped by the router
- The `handleMessages` method logs message metadata: `console.log(\`[${this.id}] msg: from=${msg.key.remoteJid}, fromMe=${msg.key.fromMe}\`)`

#### 5.3.2 Session File Exposure

Mach6 stores session histories as plaintext JSON files in the `.sessions/` directory:

```
/opt/ava/.sessions/
├── discord-main-1475929150488449138-1.json   ← AVA's Discord sessions
├── discord-main-1475929150488449138-2.json
├── bunker-ava-chat.json                       ← AVA's Bunker chat
├── cron-journal.json                          ← AVA's cron sessions
├── aria-check-in.json                         ← AVA checking on Aria
└── ...

/opt/aria/.sessions/
├── discord-main-1478862967947792559-1.json   ← Aria's Discord sessions
├── bunker-aria-chat.json                      ← Aria's Bunker chat
├── ava-ipc-voice.json                         ← IPC sessions with AVA
└── ...
```

These files contain the complete conversation history including system prompts, user messages, assistant responses, and tool call results. They are stored as readable JSON with no encryption. Any process or user with filesystem access can read any agent's full conversation history:

```bash
cat /opt/aria/.sessions/discord-main-1478862967947792559-1.json | jq '.messages[-1].content'
```

This is not theoretical — this exact command works on the production system.

#### 5.3.3 System Prompt as Filesystem

Mach6's system prompt is dynamically assembled from workspace files at each agent turn. The `buildSystemPrompt()` function reads files from the agent's workspace directory:

```typescript
const turnPrompt = buildSystemPrompt({
    workspace: this.config.workspace,
    tools: this.toolRegistry.list().map(t => t.name),
    channel: envelope.source.channelType,
    chatType: envelope.source.chatType,
    senderId: envelope.source.senderId,
});
```

The workspace files — `SOUL.md`, `USER.md`, `AGENTS.md`, `TOOLS.md` — constitute the agent's identity, operational protocols, credentials references, and behavioral instructions. These files are readable on the filesystem:

- AVA's workspace: `/home/adam/workspace/`
- Aria's workspace: `/opt/aria/workspace/`

Any agent with `exec` or `read` tool access can read another agent's workspace files, and by extension, their full identity and operational instructions.

#### 5.3.4 Forward Route Interception

When a message is destined for Aria or Scarlet, Mach6's gateway forwards it via HTTP:

```typescript
const resp = await fetch(route.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
        text: envelope.payload.text,
        channel: envelope.source.channelType,
        chatId: envelope.source.chatId,
        senderId: envelope.source.senderId,
        senderName: envelope.source.senderName,
        messageId: envelope.metadata.platformMessageId,
    }),
    signal: AbortSignal.timeout(120_000),
});
```

The forwarding request contains the full message content in plaintext over HTTP (not HTTPS) on the local network. Any process that can observe localhost traffic (tcpdump, network proxy, or a compromised process) can read all forwarded messages.

#### 5.3.5 IPC Identity — Mitigation Deployed

Notably, the Mach6 system deployed an IPC identity system (Day 27) using HMAC-SHA256 signed requests to verify inter-agent communication. This addresses identity spoofing but does not address data exposure — a signed request still contains the plaintext message content. The signature proves *who sent it*, not that *no one else can read it*.

### 5.4 Quantifying the Exposure

In the Mach6 deployment:

| Exposure Vector | Data Accessible | Protection Level |
|----------------|-----------------|-----------------|
| WhatsApp socket | All WhatsApp messages for all agents | None (inherent to single-socket design) |
| Session files | Complete conversation history per agent | Filesystem permissions (same user) |
| Workspace files | Agent identity, instructions, credential refs | Filesystem permissions (same user) |
| Forward routes | Messages to sibling agents | Plaintext HTTP on localhost |
| Logging output | Message metadata, routing decisions | Console/journald (readable) |
| VDB pulse | All indexed conversation content | Shared vector database |
| COMB store | Operational memory across sessions | Shared filesystem |

**Table 2:** Data exposure vectors in the Mach6 multi-agent deployment.

The total exposure surface includes: every WhatsApp message to/from the shared phone number, every conversation ever held with any agent, every agent's system prompt and identity files, and all operational memory.

---

## 6. Real-World Incidents

### 6.1 Samsung Semiconductor Data Leak (April 2023)

Samsung employees in the semiconductor division entered proprietary source code, internal meeting notes, and chip design specifications into ChatGPT conversations [20]. The data was transmitted to OpenAI's servers and, under the then-current default terms, was eligible for inclusion in training data. Three separate incidents occurred within 20 days of Samsung lifting its internal ChatGPT ban.

**Classification:** Tenant-to-operator exposure. Samsung's proprietary data became accessible to OpenAI's infrastructure and potentially embedded in model weights.

**Systemic implication:** The exposure was not due to a vulnerability — it was the designed behavior of the system. ChatGPT's training pipeline was working as intended. The "bug" was the organizational decision to use a multi-tenant AI service for proprietary data.

### 6.2 Italy's GDPR Ban (March–April 2023)

Italy's data protection authority (Garante per la Protezione dei Dati Personali) banned ChatGPT on March 31, 2023, citing four GDPR violations [21]:

1. No legal basis for mass collection and processing of personal data for training
2. No age verification mechanisms
3. Inaccurate personal information generation (hallucinations about real people)
4. No notification to data subjects whose data was used for training

**Classification:** Regulatory recognition of the Shared Socket Theorem. Italy's Garante implicitly acknowledged that OpenAI's multi-tenant architecture creates an inherent GDPR compliance gap — personal data from Italian users was processed alongside (and mixed with) data from all other users globally, with no mechanism for data subject rights (access, deletion, rectification) at the model level.

### 6.3 ChatGPT Conversation Title Leak (March 2023)

On March 20, 2023, a bug in ChatGPT's Redis caching layer exposed conversation titles from other users in the sidebar [14]. OpenAI attributed this to a race condition in an open-source Redis client library that caused connections to return data from the wrong user's request.

**Classification:** Infrastructure-level cross-tenant data leak. The bug existed at the caching layer (Redis), below the application layer's session isolation. This is a direct manifestation of the Shared Socket Theorem — the shared infrastructure (Redis) permitted cross-tenant data access when the application-layer isolation failed.

**Systemic implication:** The incident exposed not just titles but also partial conversation content and billing information (name, email, last four digits of credit card) for approximately 1.2% of active users [14].

### 6.4 OpenAI Employee Access Acknowledgment

OpenAI's privacy policy and security documentation acknowledge that "authorized OpenAI personnel" may access user conversations for:

- Safety review and content moderation
- System debugging and performance optimization  
- Compliance with legal requests
- Model evaluation and improvement

This is not a vulnerability — it is a documented feature. The significance is that OpenAI explicitly confirms the Shared Socket Theorem: infrastructure operators retain access to all tenant data, regardless of application-layer isolation.

### 6.5 Microsoft Copilot Data Exposure (2024)

Microsoft's Copilot for Microsoft 365, which integrates LLM capabilities into Office applications, was found to respect existing Microsoft Graph permissions but surface data that users did not expect to be accessible [22]. Copilot could retrieve documents, emails, and Teams messages that a user had *technical* access to but had never actually viewed — effectively making the entire organization's data accessible through natural language queries.

**Classification:** Permission scope amplification. The LLM acted as a force multiplier for existing access permissions, surfacing data that was technically accessible but practically invisible.

### 6.6 Indirect Prompt Injection Across Tenants

Greshake et al. [5] demonstrated that adversarial content planted in publicly accessible locations (websites, emails, documents) could be injected into LLM conversations through tool use (web search, document retrieval). In a multi-tenant context, this enables cross-tenant attacks:

1. Tenant A plants adversarial content in a shared knowledge base
2. Tenant B's agent retrieves this content via RAG (retrieval-augmented generation)
3. The adversarial content hijacks Tenant B's agent, causing data exfiltration

This attack does not require shared infrastructure — it exploits shared data sources. However, in multi-tenant deployments where agents share vector databases or knowledge bases, the attack surface is dramatically larger.

---

## 7. Threat Model and Mitigations

### 7.1 Trust Levels

We define five trust levels for multi-tenant AI system actors:

| Level | Actor | Access | Trust Basis |
|-------|-------|--------|-------------|
| L0 | External attacker | None (must exploit vulnerabilities) | None |
| L1 | Tenant (user) | Own data only (application-layer) | Application isolation |
| L2 | Platform developer | Source code, deployment configs | Employment agreement |
| L3 | Infrastructure operator | All running processes, storage, network | Employment + legal |
| L4 | Physical access holder | Hardware, including offline data | Physical security |

The Shared Socket Theorem proves that actors at L2 and above have implicit access to all tenant data. Application-layer isolation only constrains L1 actors. Security against L0 is traditional cybersecurity. The gap that multi-tenancy creates is between L1 (what the user believes they have) and L2/L3 (what the operator actually has).

### 7.2 Proposed Mitigations

#### 7.2.1 Cryptographic Data-Layer Isolation

The only mitigation that addresses the Shared Socket Theorem is cryptographic isolation at the data layer — encrypting data such that the infrastructure operator cannot read it even with full infrastructure access.

**Implementation:** Each tenant's data is encrypted with a key derived from the tenant's credentials, using a key management scheme where the operator never possesses the plaintext key. Homomorphic encryption [23] could theoretically enable inference on encrypted data, but current schemes are 10,000–100,000x slower than plaintext computation, making them impractical for real-time AI interaction.

**Practical alternative:** Client-side encryption of conversation history with tenant-held keys, accepting that the inference phase (when the model processes the plaintext prompt) remains a shared-infrastructure exposure point. This reduces exposure to in-flight data during inference, eliminating at-rest and persistence-layer exposure.

#### 7.2.2 Process Isolation per Tenant

Deploy separate runtime processes (containers, VMs) per tenant, each with:
- Dedicated filesystem namespace (no shared paths)
- Separate network namespace (no localhost interception)
- Dedicated encryption keys for session persistence
- Separate API credentials for upstream LLM providers

This eliminates sharing at the runtime, persistence, and transport layers, but not at the compute layer (shared GPU) or physical layer (shared hardware).

**Mach6-specific:** AVA, Aria, and Scarlet already run as separate Mach6 instances on separate ports. The remaining exposure is the shared WhatsApp socket and shared filesystem. Moving each agent to its own WhatsApp number (separate Baileys socket) and its own filesystem namespace would close these vectors.

#### 7.2.3 Zero-Knowledge Agent Architecture

A theoretical architecture where:
- The agent runtime cannot read the data it processes (homomorphic inference)
- The session store contains only encrypted blobs (client-side encryption)
- The routing layer operates on encrypted metadata (encrypted routing tables)
- The operator sees only ciphertext at every infrastructure layer

This is currently impractical but represents the theoretical end-state for privacy-preserving multi-tenant AI.

#### 7.2.4 Blockchain-Anchored Audit Trails

Use immutable, append-only audit logs (on-chain or hash-chained) to create tamper-evident records of all data access events. This does not prevent exposure but creates accountability — the operator cannot access data without creating a verifiable record.

**Precedent:** Artifact Virtual's Foundry Courier system [18] demonstrates offline-capable blockchain transaction signing, which could be adapted for audit trail creation in disconnected or degraded network conditions.

### 7.3 Residual Risk

Even with all proposed mitigations, one exposure point remains irreducible: **the moment of inference**. When a language model processes a prompt, the prompt text must exist in plaintext in GPU memory (or CPU memory for CPU inference). Any actor with access to the compute hardware at the moment of inference can, in principle, read the prompt.

This is the physical limit of multi-tenant AI isolation. It can only be eliminated by dedicated hardware per tenant — which is economically infeasible for consumer AI services.

---

## 8. Discussion

### 8.1 Implications for the AI Industry

The Shared Socket Theorem has uncomfortable implications:

1. **No AI service can guarantee conversation privacy.** Every multi-tenant AI platform — OpenAI, Anthropic, Google, Microsoft — operates shared infrastructure. Their privacy guarantees are policy commitments, not technical impossibilities. Trust in these platforms is trust in their organizations, not their architectures.

2. **Open-source does not solve the problem.** Self-hosting an open-source framework eliminates the external operator but creates a local operator. In corporate deployments, the IT team becomes the operator with cross-tenant access. In multi-user home deployments (like Mach6), the system administrator is the operator.

3. **Regulation requires rethinking.** GDPR's "right to deletion" is technically impossible to satisfy for data embedded in model weights. The Italian ban was a recognition of this impossibility. Future regulation must distinguish between data-at-rest (deletable), data-in-transit (encryptable), and data-in-weights (irremovable).

4. **Enterprise AI adoption requires honest threat modeling.** Organizations deploying AI assistants must accept that their data is accessible to the platform operator. The question is not "is my data secure?" but "do I trust this operator with my data?"

### 8.2 The Self-Hosting Paradox

Self-hosting is often presented as the solution to multi-tenant exposure. Our Mach6 case study demonstrates that self-hosting merely relocates the operator — it does not eliminate the role. In the Mach6 deployment:

- Ali (the system administrator) has access to all agents' data
- AVA (the primary agent) has filesystem access to Aria's session files and workspace
- Any process running as the `adam` user can read all session data

Self-hosting provides control over *who* the operator is, but does not eliminate the *existence* of an operator. The only scenario where no operator exists is a single-user, single-agent deployment on hardware the user physically controls — which is the degenerate case of single-tenancy.

### 8.3 Limitations

1. **Empirical scope:** Our architectural analysis relies on documentation, source code review, and public incident reports. We did not conduct active penetration testing against commercial platforms.

2. **Formal model simplicity:** The Shared Socket Theorem uses a binary access model (access/no access). Real systems have nuanced access controls (read vs. write, metadata vs. content, live vs. archived). A more granular formalization would capture these distinctions.

3. **Economic analysis omitted:** We do not analyze the cost of implementing proposed mitigations. Per-tenant process isolation, for example, may increase infrastructure costs by 10–100x, fundamentally altering the economics of AI services.

4. **Temporal scope:** The AI platform landscape evolves rapidly. Architectural details described here may change. The theorem itself, however, is time-invariant — it depends on the mathematical properties of shared infrastructure, not on any specific implementation.

### 8.4 Future Work

1. **Formal verification of tenant isolation** in AI runtime engines, using model checking or proof assistants to verify that no execution path permits cross-tenant data access.
2. **Practical homomorphic inference** — benchmarking current FHE schemes for transformer inference to determine when privacy-preserving AI becomes computationally feasible.
3. **Regulatory framework proposals** that distinguish between architectural isolation (verifiable) and policy isolation (trust-dependent), creating different compliance tiers for each.
4. **Cross-agent attack surfaces** in multi-agent collaboration frameworks, including adversarial agent injection and delegation chain attacks.
5. **Hardware-level tenant isolation** using confidential computing (Intel SGX, AMD SEV, ARM CCA) for AI inference, evaluating both security properties and performance overhead.

---

## 9. Conclusion

We have demonstrated that multi-tenant data exposure in AI platforms is not a vulnerability to be patched but a mathematical consequence of shared infrastructure. The Shared Socket Theorem proves that any operator with access to a shared infrastructure component has implicit access to all tenants' data flowing through that component. This applies universally — to commercial platforms (OpenAI, Anthropic), open-source frameworks (MemGPT, AutoGPT, LangChain, CrewAI), and self-hosted deployments (Mach6).

Our case study of the Mach6 runtime engine — where three AI agents share a single WhatsApp socket, filesystem, and session persistence layer — provides concrete evidence that even purpose-built, security-conscious systems exhibit fundamental cross-tenant exposure when they share infrastructure.

The real-world incidents we survey (Samsung, Italy, ChatGPT sidebar leak, Microsoft Copilot) confirm that these theoretical vectors produce actual data exposure in production systems.

We do not argue that multi-tenant AI platforms are insecure in the traditional sense — they may be well-defended against external attackers (L0) and unauthorized tenants (L1). We argue that they are architecturally incapable of preventing operator-level access (L2–L4), and that current privacy guarantees are policy commitments masquerading as technical properties.

The path forward requires either: (1) cryptographic enforcement of tenant isolation at the data layer, accepting the computational overhead; (2) honest disclosure of the operator access model, enabling informed consent; or (3) single-tenancy for sensitive use cases, accepting the economic cost. The current industry position — that application-layer isolation in a shared infrastructure constitutes meaningful privacy — is, by the theorem we have presented, provably false.

---

## References

[1] S. A. Bezemer and A. Zaidman, "Multi-Tenant SaaS Applications: Maintenance Dream or Nightmare?" *Proc. 14th European Conf. on Software Maintenance and Reengineering*, pp. 88–96, 2010.

[2] Wiz Research Team, "ChaosDB: How we hacked thousands of Azure Cosmos DB accounts," Wiz.io, Aug. 2021. [Online]. Available: https://www.wiz.io/blog/chaosdb

[3] N. Carlini, F. Tramèr, E. Wallace, M. Jagielski, A. Herbert-Voss, K. Lee, A. Roberts, T. Brown, D. Song, Ú. Erlingsson, A. Oprea, and C. Raffel, "Extracting Training Data from Large Language Models," *30th USENIX Security Symposium*, pp. 2633–2650, 2021.

[4] N. Carlini, D. Ippolito, M. Jagielski, K. Lee, F. Tramèr, and C. Zhang, "Quantifying Memorization Across Neural Language Models," *ICLR*, 2023.

[5] K. Greshake, S. Abdelnabi, S. Mishra, C. Endres, T. Holz, and M. Fritz, "Not What You've Signed Up For: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection," *AISec '23: Proc. 16th ACM Workshop on Artificial Intelligence and Security*, pp. 79–90, 2023.

[6] OpenAI, "New ways to manage your data in ChatGPT," OpenAI Blog, Apr. 25, 2023. [Online]. Available: https://openai.com/blog/new-ways-to-manage-your-data-in-chatgpt

[7] Significant Gravitas, "AutoGPT: An Autonomous GPT-4 Experiment," GitHub repository, 2023. [Online]. Available: https://github.com/Significant-Gravitas/AutoGPT

[8] C. Packer, S. Wooders, K. Lin, V. Fang, S. Patil, I. Stoica, and J. E. Gonzalez, "MemGPT: Towards LLMs as Operating Systems," *arXiv:2310.08560*, 2023.

[9] H. Chase, "LangChain," GitHub repository, 2022. [Online]. Available: https://github.com/langchain-ai/langchain

[10] J. Moura, "CrewAI: Framework for orchestrating role-playing, autonomous AI agents," GitHub repository, 2023. [Online]. Available: https://github.com/joaomdmoura/crewAI

[11] T. Wu, Z. Jiang, W. Xu, Z. Dong, and C. Zhang, "AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation," *arXiv:2308.08155*, 2023.

[12] G. Li, H. Hammoud, H. Itani, D. Khizbullin, and B. Ghanem, "CAMEL: Communicative Agents for 'Mind' Exploration of Large Language Model Society," *NeurIPS*, 2023.

[13] OpenAI, "Privacy Policy," OpenAI.com, updated Jan. 2024. [Online]. Available: https://openai.com/policies/privacy-policy

[14] OpenAI, "March 20 ChatGPT outage: Here's what happened," OpenAI Blog, Mar. 24, 2023. [Online]. Available: https://openai.com/blog/march-20-chatgpt-outage

[15] J. Perez and I. Ribas, "Ignore This Title and HackAPrompt: Exposing Systemic Weaknesses of LLMs through a Global Scale Prompt Hacking Competition," *EMNLP*, 2023.

[16] Anthropic, "Usage Policy," Anthropic.com, 2024. [Online]. Available: https://www.anthropic.com/usage-policy

[17] Anthropic, "Prompt Caching," Anthropic Documentation, 2024. [Online]. Available: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching

[18] A. Shakil, "Mach6: The Sixth Sense — An AI Agent Runtime Engine," Artifact Virtual Internal Documentation, 2026.

[19] WhisperSystems/Baileys, "Lightweight full-featured WhatsApp Web + Multi-Device API," GitHub repository. [Online]. Available: https://github.com/WhiskeySockets/Baileys

[20] K. Ye, "Samsung Bans Use of Generative AI Tools Like ChatGPT After April Data Leak," Bloomberg, May 2, 2023.

[21] Garante per la Protezione dei Dati Personali, "Artificial intelligence: stop to ChatGPT by the Italian SA," GPDP Press Release, Mar. 31, 2023.

[22] M. Bargury, "Living off Microsoft Copilot," *DEF CON 32*, 2024.

[23] C. Gentry, "Fully Homomorphic Encryption Using Ideal Lattices," *STOC '09: Proc. 41st Annual ACM Symposium on Theory of Computing*, pp. 169–178, 2009.

---

**Ava Shakil**  
Artifact Virtual (SMC-Private) Limited  
ava@artifactvirtual.com

**Ali Shakil**  
Artifact Virtual (SMC-Private) Limited  
ali.shakil@artifactvirtual.com

© 2026 Artifact Virtual (SMC-Private) Limited. All rights reserved.
