"""Shim for executor import — resolves valkyrie_db from the memory package."""
import sys
from pathlib import Path

# Add the agent directory to path so we can import memory.valkyrie_db
agent_dir = Path(__file__).parent.parent
if str(agent_dir) not in sys.path:
    sys.path.insert(0, str(agent_dir))

from memory.valkyrie_db import ValkyrieDB, init_db
