## v2.1 Entropy Fix — PREPARED, NOT YET DEPLOYED

### Bug in v2.0
Lines 402-412 of dragon_digest_v2.py:
```python
# Entropy regularization: penalize collapsed distributions
with torch.no_grad():           # ← BUG: no_grad blocks gradient flow
    log_probs = F.log_softmax(logits.view(-1, logits.size(-1)).float(), dim=-1)
    probs_ent = log_probs.exp()
    token_entropy = -(probs_ent * log_probs).sum(dim=-1)
    mask = (y.view(-1) != 0).float()
    avg_entropy = (token_entropy * mask).sum() / mask.sum().clamp(min=1)

# This penalty is a CONSTANT — no gradients flow through it
entropy_penalty = 0.01 * F.relu(8.0 - avg_entropy)
loss = ce_loss + entropy_penalty
```

The `with torch.no_grad()` block means `avg_entropy` has no grad_fn.
`F.relu(8.0 - avg_entropy)` produces a tensor with no gradient.
Adding it to `ce_loss` doesn't change the backward pass AT ALL.
The entropy penalty is logged but never backpropagated.

### Fix for v2.1
Remove the `with torch.no_grad()` wrapper. Compute entropy with gradients:
```python
# Entropy regularization: penalize collapsed distributions  
log_probs = F.log_softmax(logits.view(-1, logits.size(-1)).float(), dim=-1)
probs_ent = log_probs.exp()
token_entropy = -(probs_ent * log_probs).sum(dim=-1)
mask = (y.view(-1) != 0).float()
avg_entropy = (token_entropy * mask).sum() / mask.sum().clamp(min=1)

# Target entropy ~8.0 (healthy range for 16K vocab, max=9.68)
entropy_penalty = 0.01 * F.relu(8.0 - avg_entropy)
loss = ce_loss + entropy_penalty
```

### Impact Assessment
- Label smoothing 0.1 on CrossEntropyLoss is the PRIMARY anti-collapse defense
- It spreads 10% of probability mass across all tokens, directly preventing delta functions
- Entropy reg is a SECONDARY reinforcement
- v2.0 is running fine without functional entropy reg — label smoothing is carrying the load
- If we see collapse signs despite label smoothing, deploy v2.1 with working entropy reg

### Decision: DO NOT restart current training
- v2.0 Phase A is running healthy (loss ~5.9-6.2, step 40)
- Restarting costs 40 steps × 20s = 13 minutes + corpus reload (~8 min)
- Risk of collapse without entropy reg: LOW (label smoothing is sufficient)
- Will deploy v2.1 for Phase B if needed
