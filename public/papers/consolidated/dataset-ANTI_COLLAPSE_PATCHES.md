# GLADIUS Dragon Digestion — Anti-Collapse Patches
# Apply these to dragon_digest.py before resuming from step 1000
# 
# Root cause: mode collapse on function words due to:
#   1. No label smoothing → model becomes overconfident
#   2. Weight tying creates feedback loop (embedding ↔ output head)
#   3. Plain CrossEntropyLoss rewards sharp distributions
#
# Fixes:
#   1. Label smoothing (0.1) — forces some probability mass to non-target tokens
#   2. Entropy regularization — penalizes low-entropy (collapsed) output distributions
#   3. Repetition penalty in eval sampling
#   4. Multiple diverse eval prompts

# === PATCH 1: Replace criterion (line ~356) ===
# OLD:
#   criterion = nn.CrossEntropyLoss(ignore_index=0)
# NEW:
#   criterion = nn.CrossEntropyLoss(ignore_index=0, label_smoothing=0.1)

# === PATCH 2: Add entropy regularization to training loop (line ~399) ===
# OLD:
#   loss = criterion(logits.view(-1, logits.size(-1)), y.view(-1))
#   loss_scaled = loss / accum_steps
# NEW:
#   ce_loss = criterion(logits.view(-1, logits.size(-1)), y.view(-1))
#   # Entropy regularization: penalize collapsed distributions
#   log_probs = F.log_softmax(logits.view(-1, logits.size(-1)), dim=-1)
#   probs = log_probs.exp()
#   token_entropy = -(probs * log_probs).sum(dim=-1)  # per-token entropy
#   # Mask out padding (ignore_index=0)
#   mask = (y.view(-1) != 0).float()
#   avg_entropy = (token_entropy * mask).sum() / mask.sum().clamp(min=1)
#   # We WANT higher entropy, so subtract (maximize entropy = minimize negative entropy)
#   entropy_penalty = 0.01 * (8.0 - avg_entropy).clamp(min=0)  # target entropy ~8 (log(16000)≈9.68)
#   loss = ce_loss + entropy_penalty
#   loss_scaled = loss / accum_steps

# === PATCH 3: Better eval sampling with repetition penalty (replace sample_model function) ===
# See the function below

# === PATCH 4: Multiple eval prompts (line ~457) ===
# OLD:
#   sample_text = sample_model(model, "The meaning of life is", max_len=50)
# NEW:
#   eval_prompts = [
#       "The meaning of life is",
#       "Once upon a time there was",
#       "In the history of science",
#       "The most important thing about",
#       "When the sun rises over the"
#   ]
#   prompt = eval_prompts[step // eval_every % len(eval_prompts)]
#   sample_text = sample_model(model, prompt, max_len=50, rep_penalty=1.3)
