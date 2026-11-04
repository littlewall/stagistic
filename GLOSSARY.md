# Stagistic

A writing app for theatre scripts. The script document is the source of truth; the Board is a live view of its acts, scenes and characters.

## Board

**Lens**:
One of the Board's views over the same script: Wall, Matrix, Arcs or Rundown.
_Avoid_: Tab, mode, page

**Script evidence**:
A character's cue or character tag inside a scene, which places the character in that scene.
_Avoid_: Appearance, mention

**On the card**:
A character shown on a scene's card, either through script evidence or because the writer added them by hand, set an arc point or wrote a note.
_Avoid_: Present, assigned

**In scene / not in scene**:
The words the Board uses for script evidence: "in scene" when the script places the character there, "not in scene" when they are only on the card.
_Avoid_: Present, absent

**Arc**:
One character's line across the scenes in Arcs, rising when their situation gets better and falling when it gets worse.
_Avoid_: Curve, trajectory, plot line

**Arc point**:
A character's arc value in one scene. An arc point puts the character on the card. A note without a stored value is an arc point on the baseline.
_Avoid_: Beat, node, dot

**Baseline**:
The neutral level of an arc; points above it are better, points below it worse.
_Avoid_: Zero line, axis

**Active character**:
The single character whose arc can be edited in Arcs. Without one, Arcs is an overview.
_Avoid_: Selected character, focused character

**Rundown**:
The lens that lists the show top to bottom: acts, their scenes with the characters on each card, and the songs in each scene with their singers.
_Avoid_: Numbers, running order, breakdown

**Song**:
A music cue from its music start to its end, whether sung, instrumental or a hit.
_Avoid_: Number, music number

**Singer**:
A character with a cue in a lyrics block inside a song. Groups count through their members.
_Avoid_: Performer, vocalist
