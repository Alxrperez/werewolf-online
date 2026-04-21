# Werewolf Online — AI Art Prompt Pack

A ready-to-use prompt file for image-generation AIs (Midjourney, DALL·E 3, Stable
Diffusion / SDXL, Flux, Leonardo, Firefly). Copy a prompt, paste it into your
tool of choice, and keep the **Style Anchor** block at the top of every prompt
so the whole set looks like one coherent game.

> **How to use this file**
> 1. Pick your tool. Midjourney/Flux handle long prose prompts well; SDXL prefers
>    comma-separated tags — both styles are included.
> 2. Always prepend the **Style Anchor** to each prompt.
> 3. Lock the seed once you find a look you like so the whole set stays consistent.
> 4. Keep transparent PNG outputs for icons/avatars; solid backgrounds for scenes.

---

## 0. STYLE ANCHOR (prepend to every prompt)

**Prose form (Midjourney / Flux / DALL·E):**
```
Dark-fantasy village of the werewolf card game. Painterly storybook illustration,
moody cinematic lighting, deep indigo and charcoal palette with single accent
color per faction (village = teal #2A9D8F, werewolf = crimson #E63946,
neutral = amber #F4A261). Subtle gold rim-light, soft volumetric fog,
hand-painted texture, visible brushwork, no photorealism, no modern objects,
no text, no watermarks, centered composition.
```

**Tag form (SDXL / SD1.5):**
```
dark fantasy storybook illustration, painterly, moody cinematic lighting,
deep indigo charcoal palette, (teal 2A9D8F:1.1) OR (crimson E63946:1.1) OR
(amber F4A261:1.1) accent, gold rim light, volumetric fog, hand-painted texture,
brushwork, no text, no watermark, no photorealism, centered
```

**Global negative prompt** (append to every SDXL/SD prompt):
```
text, logo, watermark, signature, border, frame, modern clothing,
modern technology, photograph, 3D render, blurry, lowres, extra fingers,
deformed, extra limbs, jpeg artifacts, oversaturated
```

**Global parameters (Midjourney v6):** `--ar 1:1 --style raw --stylize 250 --v 6`
**SDXL sampler:** `DPM++ 2M Karras, 30 steps, CFG 6–7`

---

## 1. BRAND & GLOBAL

### 1.1 Logo / wordmark
```
Stylized wordmark "WEREWOLF ONLINE" in a carved-wood runic serif typeface,
moonlit silver edge glow, a crescent moon nestled inside the 'O', subtle
claw-scratch motif under the baseline, centered on transparent background,
vector-clean linework, icon-ready at 512px.
--ar 16:5 --transparent
```

### 1.2 Favicon mark
```
Minimal emblem of a crescent moon overlapping a wolf silhouette's eye, single
amber accent dot for the pupil, flat-color heraldic style, readable at 16px,
transparent background.
--ar 1:1
```

### 1.3 OG share image (1200×630)
```
Werewolf game key art. Village silhouette at night under a huge moon, thirteen
hooded figures standing in a circle, one with glowing red eyes, fog rolling
through. Title "WEREWOLF ONLINE" in carved-wood serif on lower third.
Cinematic, painterly, dramatic rim light.
--ar 40:21
```

---

## 2. ROLE PORTRAITS (17 roles)

> **Spec:** 1024×1024 PNG, transparent background. The avatar crop (for player
> lists) is a 256×256 head-and-shoulders re-render — generate a second pass with
> the same seed and `"head and shoulders bust, centered"` appended.

### Werewolf team (crimson accent)

**2.1 Werewolf**
```
A hulking werewolf standing upright in a moonlit forest clearing, half-shifted,
torn villager clothing hanging off sinewed muscle, yellow eyes, bared fangs,
crimson rim-light, fog at ankles.
```

**2.2 Alpha Werewolf**
```
The largest and oldest werewolf, a thorn-iron crown embedded in matted fur,
one ragged scar down the muzzle, towering over a pack of smaller wolves behind
him, crimson rim-light, regal menacing pose.
```

**2.3 Wolf Cub**
```
A young werewolf, smaller and leaner than the adults, oversized paws and ears,
curious not yet cruel, hiding half behind an older wolf's leg, crimson rim-light,
dusk forest.
```

**2.4 Sorceress**
```
A tall cloaked woman with wolf-bone fetishes braided into her hair, one eye
glowing violet, casting a divination over a bowl of dark water, her shadow on
the wall is unmistakably a wolf. Crimson and deep purple palette.
```

### Village team (teal accent)

**2.5 Villager**
```
An ordinary medieval peasant with a worried expression, simple wool tunic,
lantern in hand, standing in a cottage doorway at night. Teal rim-light,
kind weathered face, no special regalia — this character must read as "nobody
important" next to the other roles.
```

**2.6 Seer**
```
A hooded mystic woman holding a crystal orb that glows pale teal, reflected
constellations inside the orb, embroidered robes with star motifs, knowing
calm expression.
```

**2.7 Doctor**
```
A village healer, apron over traveling clothes, leather satchel of bandages
and vials at hip, holding a small wooden cross-marked kit, warm concerned
eyes, teal rim-light, candlelit room background.
```

**2.8 Bodyguard**
```
A stoic warrior in chainmail under a dark tabard, large round shield emblazoned
with the village sigil raised defensively, short sword at hip, scar across brow,
teal rim-light.
```

**2.9 Hunter**
```
A grizzled woodsman drawing a longbow at full tension, arrow nocked and aimed
at the viewer, leather jerkin, quiver of black-fletched arrows, teal rim-light,
misty forest background.
```

**2.10 Witch**
```
A village herbwoman in a patchwork shawl, a green healing potion in her left
hand and a red poison vial in her right, cauldron steaming behind her, knowing
crooked smile. Teal accent dominant.
```

**2.11 Cupid**
```
An androgynous figure in a pale travelling cloak with small downy wings
tucked behind, holding a delicate bow of bound branches, a heart-shaped arrow
mid-flight trailing pink light, night village square at distance. Subtle pink
accent on top of the teal.
```

**2.12 Little Girl**
```
A small girl in a nightgown peeking around a doorframe, one eye visible, clutching
a stuffed wolf toy, a sliver of moonlight on her face, the rest in shadow.
Vulnerable and slightly eerie, not cute.
```

**2.13 Elder**
```
An ancient bearded man in a long coat, gnarled walking staff, war-medal pinned
to chest, lined face full of hard-earned wisdom, teal rim-light, standing by a
hearth. Conveys dignity.
```

**2.14 Village Idiot**
```
A disheveled harmless man with a lopsided grin and hay in his hair, patched
clothes one size too big, holding a wooden spoon like a sword, village square
background. Played affectionately, not cruelly. Distinct from the Jester —
no motley, no bells.
```

**2.15 Mason**
```
A stonemason in a leather apron with a heavy hammer and chisel, sleeves rolled
up showing forearm tattoo of two crossed hammers (Mason brotherhood sigil), a
second Mason barely visible in the background exchanging a knowing nod.
```

### Neutral / third-party (amber accent)

**2.16 Tanner**
```
A melancholic leatherworker hunched over a workbench, bone needle threaded
through dark cured hide, eyes hollow and longing, a noose-shaped shadow on the
wall behind him. Amber rim-light, somber tone.
```

**2.17 Serial Killer**
```
A lone silhouetted figure in a long black coat and wide-brimmed hat, face
mostly obscured, a bloodied cleaver loose in one gloved hand, standing in a
rain-slick alley. Amber rim-light cuts only a sliver of the face. Menacing,
ambiguous, NOT cartoonish.
```

**2.18 Jester**
```
A theatrical fool in full harlequin motley of black-and-amber diamonds, bells
on hat and cuffs, a mask that is laughing on one half and weeping on the other,
posed mid-bow before an unseen gallows. Amber rim-light, clearly distinct from
the Village Idiot (motley + mask + performance pose).
```

### 2.19 Role card back (shared)
```
An ornate card back illustration: a large crescent moon over a stylized wolf
paw print, surrounded by baroque filigree in silver on deep indigo velvet
texture, slight embossed sheen, centered, game-card proportions.
--ar 5:7
```

### 2.20 Unknown role placeholder
```
A question-mark silhouette inside a featureless hooded cloak standing in fog,
faceless, same frame and lighting as the role portraits so it slots into the
same UI. Neutral grey palette, no faction accent.
```

---

## 3. TEAM SIGILS / BADGES

Square PNG, transparent, 512×512, heraldic flat-color style.

**3.1 Village sigil**
```
Heraldic emblem: a shield containing a lit lantern crossed with a shepherd's
staff, teal and silver, flat-color woodcut style, transparent background.
```

**3.2 Werewolf sigil**
```
Heraldic emblem: a shield containing a snarling wolf head silhouette with
three claw slashes across it, crimson and black, flat-color woodcut style,
transparent background.
```

**3.3 Neutral sigil**
```
Heraldic emblem: a shield containing a masked face split between laughing and
weeping, amber and charcoal, flat-color woodcut style, transparent background.
```

**3.4 Lovers badge**
```
Two entwined hearts bound by a pink ribbon, one heart in teal and one in
crimson halves to show cross-team love, small and icon-ready, transparent bg.
```

**3.5 Masons badge**
```
Two crossed stonemason hammers over a small square stone, silver on teal,
transparent background.
```

---

## 4. PHASE BACKGROUNDS

Wide 16:9, 1920×1080, seamless edges where possible.

**4.1 Lobby**
```
A warm tavern interior seen from a low angle: hearth fire glowing, long wooden
table with mugs, banners of a village crest on the walls, soft shafts of light
through small windows. Empty stools suggest players arriving. Painterly, cozy
but with a hint of unease.
--ar 16:9
```

**4.2 Role reveal backdrop**
```
An abstract indigo void with drifting embers and faint runic symbols,
centered vignette, nothing distracting — a stage for a single glowing card to
sit on top.
--ar 16:9
```

**4.3 Night**
```
A medieval village from above at deep night, crescent moon overhead, thick
low fog between the houses, one window glowing amber, wolves' eyes faintly
visible in the treeline. Painterly, dread-soaked, teal/indigo palette.
--ar 16:9
```

**4.4 Dawn report**
```
The same village at first light, sun rising behind the church steeple, three
crows silhouetted on a rooftop, mist lifting to reveal what happened overnight.
Warm amber sunrise against cold blue mist.
--ar 16:9
```

**4.5 Day discussion**
```
The village town square in full daylight, worn cobblestones, a central well,
market stalls at the edges empty of goods, banners flapping. Bright but not
cheerful — something happened here last night.
--ar 16:9
```

**4.6 Day vote**
```
The same town square at high-noon, a wooden gallows platform now visible at the
far end, long harsh shadows, tension in the air. Same camera angle as 4.5 so
the two read as a sequence.
--ar 16:9
```

**4.7 Game Over — Village win**
```
Villagers embracing under sunrise in the town square, banners raised, the body
of a fallen wolf at their feet. Teal and gold palette, triumphant but solemn.
--ar 16:9
```

**4.8 Game Over — Werewolf win**
```
A ruined village at blood-red dawn, a pack of wolves on the cobbles, one alpha
standing atop the well, bodies of villagers scattered. Crimson and black.
--ar 16:9
```

**4.9 Game Over — Tanner win**
```
A swinging empty noose under a grey sky, a single amber lantern on the gallows
steps still burning, crows departing. Bleak and lonely.
--ar 16:9
```

**4.10 Game Over — Serial Killer win**
```
A single silhouetted figure in a long coat standing alone in an empty village
square at 3am, bodies implied but not shown, rain-slick stones reflecting a
crimson moon. Amber lantern in hand.
--ar 16:9
```

**4.11 Game Over — Lovers win**
```
Two figures — one in a villager's cloak, one with wolf ears — holding hands
atop a hill under a pink-tinted moon, a burning village at their backs. Pink
and crimson, bittersweet.
--ar 16:9
```

---

## 5. UI ICONS

All icons: **single-color SVG feel, 256×256 PNG, transparent, flat with subtle
inner shadow, white-on-transparent.** Style anchor still applies but simplified.

```
Line-art game UI icon, single color white, minimal strokes, flat design with
subtle inner shadow, crisp at 32px, transparent background, centered.
```

Per-icon subjects (append to the wrapper above):

- `5.1 Speaker on` — speaker with three curved sound waves
- `5.2 Speaker muted` — speaker with diagonal slash
- `5.3 Connected` — small paw-print with three radiating signal arcs
- `5.4 Disconnected` — same paw-print with broken signal arcs and an X
- `5.5 Timer` — wooden hourglass, grains falling
- `5.6 Night phase` — crescent moon with two small stars
- `5.7 Day discussion phase` — rising sun over simple rooftops
- `5.8 Vote phase` — pair of scales, slightly tilted
- `5.9 Drawn bow` — longbow at full tension, arrow nocked (for Hunter overlay)
- `5.10 Trophy` — simple chalice-style trophy with a wolf-paw emblem
- `5.11 Broken mask` — cracked theater mask for "you lost"
- `5.12 Reset arrow` — circular reset arrow, thick stroke (for Play Again)
- `5.13 Door` — plain wooden door with iron handle (for Leave)
- `5.14 Pointing finger` — accusatory finger, three-quarter view (Accuse)
- `5.15 Double check` — two overlapping check marks (Second the accusation)
- `5.16 Banned circle` — circle with diagonal slash (Skip vote)
- `5.17 Noose` — simple hanging rope noose (lynch death)
- `5.18 Claw slash` — three parallel scratch marks (werewolf kill)
- `5.19 Poison bottle` — small corked vial with skull mark (witch kill)
- `5.20 Bloodied blade` — curved dagger with a drop of blood (serial killer kill)
- `5.21 Arrow` — single fletched arrow diagonal (hunter revenge)
- `5.22 Broken heart` — heart split down the middle (lover chain death)
- `5.23 Boot` — a boot kicking outward (host kick)
- `5.24 Crown badge` — small crown to overlay on host's avatar

---

## 6. PLAYER TOKEN / AVATAR FRAME

**6.1 Base token frame**
```
A circular heraldic frame of twisted iron and oak, empty center, designed to
hold a character portrait, soft inner glow, transparent background. Needs to
tint-match any of 20 palette colors via color overlay.
--ar 1:1
```

**6.2 Alive state ring**
```
Thin glowing ring, single color (will be tinted), soft pulse vibe, transparent
background, 512x512.
```

**6.3 Dead state frame**
```
The same token frame but fractured, one corner of the iron broken away,
desaturated, a small X or bone across it, transparent background.
```

**6.4 On-trial highlight ring**
```
Jagged gold-and-red warning ring, crackling energy vibe, slightly larger than
the token frame, transparent background, for animation overlay.
```

**6.5 "You" marker**
```
A tiny gold crown-shaped pointer that sits just above a circular token,
transparent background, readable at 24px.
```

---

## 7. SET-PIECE CINEMATIC FRAMES

For each, request **a 3-frame micro-sequence** (beginning / peak / end) at
square aspect, which you can stack into a Lottie or a sprite strip.

**7.1 Lover reveal** — two hands meeting across a moonlit window, pink thread
tying them, hearts glowing in sync.

**7.2 Mason reveal** — two hooded figures lower their hoods to each other in a
candlelit cellar, hammers on a table between them, small smile of recognition.

**7.3 Seer investigation** — a crystal orb held in hands, first dark, then
glowing with the silhouette of a wolf (or a villager's lantern) inside.

**7.4 Sorceress scry** — a bowl of black water, a face reflecting inside, a
single glowing eye opening/closing to answer yes or no.

**7.5 Little Girl peeking** — sequence of a child's eye at a keyhole, the eye
widens as she sees something, then a claw-shadow falls across her face.

**7.6 Little Girl caught** — claw-shadow, then a single scrap of white
nightgown on the floor, moonlight on it.

**7.7 Witch potions** — two hands, one offering a green vial (heal), one a red
vial (poison), the camera pushes in on whichever she chooses.

**7.8 Bodyguard intercept** — a raised shield catches a descending fang, sparks
fly, the bodyguard staggers back.

**7.9 Doctor save** — a glowing poultice pressed to a villager's chest,
warm teal light blooms outward, villager's eyes flutter open.

**7.10 Dawn body reveal** — a white sheet being lifted in the morning mist,
the viewer never sees under it, only the reactions of bystanders.

**7.11 Lynch** — a wooden gavel strikes a stone block, rope tautens, silhouette
falls — intercut extremely quickly, no graphic gore.

**7.12 Hunter's last shot** — a wounded Hunter on knees draws one final arrow,
releases, we follow the arrow in slow-motion to the target silhouette.

**7.13 Jester wins** — the hanging Jester's mask falls off and lands face-up,
laughing; confetti and black feathers drift.

**7.14 Elder survives** — a claw descends onto the Elder, an old war-medal on
his chest flares gold and deflects the blow; his eyes open, defiant.

**7.15 Alpha conversion** — Alpha's glowing red claws sink into a villager's
shoulder, red veins spiderweb outward, the villager's eyes flash yellow.

**7.16 Wolf Cub rage** — the pack throws back their heads in a double-howl,
two full moons briefly visible, claw-mark transition to the next scene.

---

## 8. TEXTURE / PARTICLE PLATES

All tileable / transparent PNG, 2048×2048 unless noted.

**8.1 Film grain overlay** — *"Subtle monochrome film grain texture, tileable,
30% intensity, transparent background, for overlay on dark backgrounds."*

**8.2 Night fog sprite** — *"Soft grey-blue fog wisp, transparent background,
512x256, meant to scroll horizontally as a particle."*

**8.3 Day dust motes** — *"Tiny golden dust particles floating in a sunbeam,
transparent background, loopable animation reference frames."*

**8.4 Lobby embers** — *"Warm orange embers rising from a fire, transparent,
sprite sheet of 16 frames."*

**8.5 Lovers petals** — *"Pink rose petals drifting diagonally, transparent,
sprite sheet of 16 frames."*

**8.6 Blood splatter decal** — *"A single stylized dark-red ink-brush splatter,
transparent background, not gory, used as a small decal on player tokens at
the moment of death."*

**8.7 Parchment texture** — *"Aged parchment paper texture, tileable, warm
off-white with occasional ink stains, for chat bubbles and card backs."*

**8.8 Moon phase set (8 frames)** — *"Eight moon phases from new to full,
silver on transparent, flat shaded, each frame 256x256, to indicate round
progression."*

---

## 9. MARKETING

**9.1 Landing hero**
```
Group of seven silhouetted villagers standing in a semicircle at night, one
villager at the center with faintly glowing red eyes (subtle, not obvious),
moonlit cobblestones, huge harvest moon behind them, title banner "Who do you
trust?" carved into a wooden plank at the bottom. 21:9 cinematic crop.
--ar 21:9
```

**9.2 Phone mockup screenshot frame**
```
A modern smartphone in a dark wooden frame sitting on a cobblestone surface
with fog rolling past, screen area perfectly blank and flat for UI compositing,
painterly ambient background.
--ar 9:16
```

**9.3 Role reveal demo loop (GIF)**
Generate 12 frames of a role card flipping from the 2.19 card back to a random
2.x role portrait, matching the in-game Framer Motion flip animation.

---

## 10. WORKFLOW TIPS

1. **Lock a seed** after the first role portrait you like — reuse for all 17 roles
   so palette, lighting and rendering stay consistent.
2. **Batch in faction groups** (all 4 wolves, then all Villagers, then neutrals) —
   the model stays in style better than jumping around.
3. **Upscale at the end** (Topaz, Magnific, SD upscaler) — don't bake upscaling
   into the generation; you'll lose the painterly texture.
4. **Post-process for transparency** — most AI tools output a white/grey
   background. Run through rembg or Photoshop's Remove Background for icons
   and role avatars.
5. **Export deliverables**
   - Role portraits: 1024×1024 PNG + 256×256 avatar crop
   - Backgrounds: 1920×1080 JPG (smaller file) + 2560×1440 master PNG
   - Icons: 256×256 PNG + optional SVG re-trace
   - Sigils: 512×512 PNG
6. **File naming convention** — match the code:
   `role_werewolf.png`, `role_seer.png`, `phase_night.jpg`, `icon_noose.svg`,
   `sigil_village.png`, etc. The `packages/client/public/art/` directory is the
   expected drop location.
