Implementation-Ready Specification (v1.0)

Status: Stable Chain: Base (EVM) License: AGPL-3.0 Admin: Timelock+Safe Integrates: ARCx token, ARCxEligibility, MACI

0) Purpose & Scope

Non-transferable, revocable, EAS-gated SBTs proving contributor roles; decay-weighted identity power; deterministic eligibility per governance topic; full event surface for indexing and monitoring.

1) Roles, Topics, Bitmasks

Roles (bytes32): ROLE_CODE, ROLE_VALIDATOR, ROLE_GOV, ROLE_RWA_CURATOR, ROLE_ORACLE_OP, ROLE_AUDITOR.
Topics (bitmask uint256): TOKEN=1<<0, SBT=1<<1, RWA_ENERGY=1<<2, RWA_CARBON=1<<3, GRANTS=1<<4, PARAMS=1<<5, TREASURY=1<<6.
Role→Topic map stored on-chain (roleTopicMask[role]).

2) Attestation Layer (EAS)

Issuance requires an EAS attestation UID under configured schemaId_IdentityRole. Checks: schema==schemaId_IdentityRole, recipient==to, attester∈issuers, expiresAt>=now+margin, refUID==0 or allowed, data decodes to (role,address,issuer,expiresAt,uri,evidenceHash). One-time UID consumption; revocation prospective only.

3) Token Model

ERC-721-compatible, ERC-5192 “Locked” SBT. tokenId=keccak256(abi.encode(to, role, version)). Transfer/approve disabled; revoke() burns. Re-issue bumps per-address role version. Metadata URI points to role record; evidenceHash stored.

4) Activity & Decay

Per (address,role) heartbeat lastBeat auto-updated by recognized on-chain actions (vote snapshot, proposal interaction, oracle update, attest) via hook interfaces; manual heartbeat(role) allowed. Decay multiplier: decay(Δ)=max(floor, expWad(-Δ/T)). Defaults: T=90d, floor=0.25e18. Expired roles contribute 0.

5) Weights & Eligibility

Identity component: f_id(addr)=Σ roleWeight[role] * decay_addr,role. weightOfForTopic(addr,mask) sums only roles whose roleTopicMask & mask != 0. ARCxEligibility applies normalization and component caps; MACI tally adapter pulls snapshot weights via IEligibility.

6) Issuers, Limits, Admin

Issuers are versioned and rate-limited per epoch (epochSeconds=86400, maxIssuesPerEpoch). Admin functions behind Timelock; pause gates mutations. Replay and reentrancy protections enforced; all critical mutations emit events.

7) Storage Layout (stable)

address timelock
address safeExecutor
address eas
bytes32 schemaId_IdentityRole
mapping(address=>bool) isIssuer
uint64 epochSeconds
uint32 maxIssuesPerEpoch
mapping(address=>mapping(uint64=>uint32)) issuesInEpoch
struct RoleRec{uint256 weightWad;uint64 expiresAt;uint64 lastBeat;bool active;string uri;bytes32 evidenceHash;uint32 version;}
mapping(address=>mapping(bytes32=>RoleRec)) roles
mapping(bytes32=>uint256) roleTopicMask
mapping(bytes32=>uint256) roleDefaultWeightWad
uint256 decay_T_seconds
uint256 decay_floorWad
mapping(bytes32=>bool) consumedUID
bool paused

8) Events & Errors

Events: IssuerAdded(address,uint256), IssuerRemoved(address,uint256), RoleIssued(address,bytes32,uint256,uint256,string,bytes32), RoleRevoked(address,bytes32,uint256,string), Heartbeat(address,bytes32,uint256), RoleWeightSet(bytes32,uint256), TopicMaskSet(bytes32,uint256), ConfigSet(bytes32,uint256), Locked(uint256).
Errors: NotIssuer(), RateLimited(), InvalidEAS(), Expired(), NotOwnerOrIssuer(), Paused(), AlreadyUsedUID(), UnsafeExpiry(), TransferDisabled().

9) Exact Semantics

issue(to,role,uid): verify EAS; enforce issuer rate-limit; create/update roles[to][role] (active=true, lastBeat=now, set expiresAt, uri, evidenceHash); mint locked ERC-721 tokenId; consume UID; emit RoleIssued.

revoke(tokenId,reason): only issuer/admin or owner; burn; set active=false; emit RoleRevoked.

heartbeat(role): only holder; set lastBeat=now; emit Heartbeat.

setRoleWeight(role,w), setTopicMask(role,mask), setConfig(key,val), addIssuer(a), removeIssuer(a): admin-only; emit.

weightOf(addr): Σ over active, non-expired roles using decay.

weightOfForTopic(addr,mask): Σ where (roleTopicMask & mask)!=0.

ERC-721 transferFrom/safeTransferFrom/approve/setApprovalForAll: revert TransferDisabled().


10) Math & Units

All weights WAD 1e18 (PRBMath). expWad for decay. Gas-bounded iteration by reading only roles present for the address; role count per address is capped via config (e.g., ≤16).

11) Security

Strict EAS schema binding; one-time UID; issuer allowlist; epoch rate-limit; pause; non-reentrancy on state mutations; bounded loops; explicit overflow/underflow checks; no delegatecall; upgrade via UUPS/Timelock; events cover every state edge.

12) On-Chain Config JSON (emitted)

{
 "sbt":{
  "schema":"IdentityRole_v1",
  "roles":{
   "ROLE_CODE":{"weightWad":"5e17","topics":["TREASURY","PARAMS","GRANTS"]},
   "ROLE_VALIDATOR":{"weightWad":"7e17","topics":["PARAMS"]},
   "ROLE_RWA_CURATOR":{"weightWad":"8e17","topics":["RWA_ENERGY","RWA_CARBON"]},
   "ROLE_GOV":{"weightWad":"6e17","topics":["TREASURY","PARAMS","GRANTS"]}
  },
  "decay":{"T_seconds":7776000,"floorWad":"2.5e17"},
  "issuers":["0x...","0x..."],
  "epochSeconds":86400,"maxIssuesPerEpoch":50,
  "maxRolesPerAddress":16,
  "version":"1.1.0"
 }
}

13) Interfaces

interface IARCxIdentitySBT{
  event IssuerAdded(address issuer,uint256 version);
  event IssuerRemoved(address issuer,uint256 version);
  event RoleIssued(address indexed to,bytes32 indexed role,uint256 tokenId,uint256 expiresAt,string uri,bytes32 evidenceHash);
  event RoleRevoked(address indexed from,bytes32 indexed role,uint256 tokenId,string reason);
  event Heartbeat(address indexed who,bytes32 indexed role,uint256 ts);
  event RoleWeightSet(bytes32 indexed role,uint256 weightWad);
  event TopicMaskSet(bytes32 indexed role,uint256 topicMask);
  event ConfigSet(bytes32 key,uint256 val);
  function issue(address to,bytes32 role,bytes32 easUID) external;
  function revoke(uint256 tokenId,string calldata reason) external;
  function heartbeat(bytes32 role) external;
  function hasRole(address who,bytes32 role) external view returns(bool);
  function weightOf(address who) external view returns(uint256);
  function weightOfForTopic(address who,uint256 topicMask) external view returns(uint256);
  function roleOf(uint256 tokenId) external view returns(bytes32);
  function setRoleWeight(bytes32 role,uint256 weightWad) external;
  function setTopicMask(bytes32 role,uint256 topicMask) external;
  function addIssuer(address issuer) external;
  function removeIssuer(address issuer) external;
  function setConfig(bytes32 key,uint256 val) external;
}

14) Reference Solidity Skeleton (no comments)

pragma solidity ^0.8.24;
import {AccessControl} from "solady/auth/AccessControl.sol";
import {Pausable} from "openzeppelin/contracts/utils/Pausable.sol";
import {ERC721} from "solady/tokens/ERC721.sol";
import {PRBMathUD60x18} from "prb-math/PRBMathUD60x18.sol";
interface IEAS{function getAttestation(bytes32 uid) external view returns(bytes32,address,address,uint64,uint64,bool,bytes32,bytes memory,uint256);}
contract ARCxIdentitySBT is ERC721,AccessControl,Pausable{
  using PRBMathUD60x18 for uint256;
  bytes32 public constant ROLE_ADMIN=keccak256("ROLE_ADMIN");
  bytes32 public constant ROLE_ISSUER=keccak256("ROLE_ISSUER");
  address public timelock; address public safeExecutor; address public eas;
  bytes32 public schemaId_IdentityRole; uint64 public epochSeconds=86400; uint32 public maxIssuesPerEpoch=50;
  mapping(address=>bool) public isIssuer; mapping(address=>mapping(uint64=>uint32)) public issuesInEpoch;
  struct RoleRec{uint256 weightWad;uint64 expiresAt;uint64 lastBeat;bool active;string uri;bytes32 evidenceHash;uint32 version;}
  mapping(address=>mapping(bytes32=>RoleRec)) public roles; mapping(bytes32=>uint256) public roleTopicMask;
  mapping(bytes32=>uint256) public roleDefaultWeightWad; uint256 public decay_T_seconds=7776000; uint256 public decay_floorWad=2.5e17;
  mapping(bytes32=>bool) public consumedUID; bool public transfersDisabled=true;
  error TransferDisabled(); error NotIssuer(); error RateLimited(); error InvalidEAS(); error Expired(); error NotOwnerOrIssuer(); error AlreadyUsedUID(); error UnsafeExpiry();
  function name() public pure override returns(string memory){return "ARC Identity SBT";}
  function symbol() public pure override returns(string memory){return "ARC-SBT";}
  function tokenURI(uint256) public view override returns(string memory){revert();}
  function supportsInterface(bytes4 iid) public view override(ERC721,AccessControl) returns(bool){return ERC721.supportsInterface(iid)||AccessControl.supportsInterface(iid);}
  function _transfer(address,address,uint256) internal pure override {revert TransferDisabled();}
  function approve(address,uint256) public pure override {revert TransferDisabled();}
  function setApprovalForAll(address,bool) public pure override {revert TransferDisabled();}
  function issue(address to,bytes32 role,bytes32 uid) external { }
  function revoke(uint256 tokenId,string calldata reason) external { }
  function heartbeat(bytes32 role) external { }
  function hasRole(address who,bytes32 role_) external view returns(bool){RoleRec storage r=roles[who][role_];return r.active&&r.expiresAt>=block.timestamp;}
  function weightOf(address who) public view returns(uint256){ }
  function weightOfForTopic(address who,uint256 mask) external view returns(uint256){ }
  function roleOf(uint256 tokenId) external view returns(bytes32){ }
  function setRoleWeight(bytes32 role,uint256 w) external { }
  function setTopicMask(bytes32 role,uint256 mask) external { }
  function addIssuer(address a) external { }
  function removeIssuer(address a) external { }
  function setConfig(bytes32 key,uint256 val) external { }
  function _epochOf(uint256 ts) internal view returns(uint64){return uint64(ts/epochSeconds);}
  function _decay(uint256 last) internal view returns(uint256){uint256 d=block.timestamp>last?block.timestamp-last:0;uint256 m=PRBMathUD60x18.exp((d*1e18)/decay_T_seconds*-1e18);return m<decay_floorWad?decay_floorWad:m;}
}

15) Testing & Invariants

Property: single-use UID; issuer-only; non-transferability; decay monotonic; expired→0; role cap per address honored.
Fuzz: issuance storms within epoch; revoke/issue churn; heartbeat spam; EAS data corruption.
Invariants: identity component ≤ cap; paused blocks mutations; no unbounded loops; issuer rate-limit holds.

Reply “Next” for ADAM Protocol.

