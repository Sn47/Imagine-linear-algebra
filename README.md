# Linear

A linear algebra playground that starts from "what is a vector" and ends at SVD. Fifteen lenses in five topics, each with a plain-language story, things to try and a small glossary, on one shared canvas you can pan, zoom and draw on.

The lenses follow 3Blue1Brown's *Essence of linear algebra*, chapter by chapter, with a few extras:

| Chapter | Lens |
|---|---|
| 1 Vectors | A vector |
| 2 Linear combinations, span, basis | Adding and scaling, Span |
| 3 Linear transformations and matrices | A matrix times a vector, Transform the plane (with a non-linear contrast) |
| 4 Matrix multiplication as composition | Transform the plane (stack matrices, reorder them) |
| 5 Three-dimensional transformations | Three dimensions |
| 6 The determinant | The determinant |
| 7 Inverse matrices, column space, null space | Undoing it (with Ax = b), Column space and null space |
| 8 Nonsquare matrices | Nonsquare matrices |
| 9 Dot products and duality | The dot product, Duality |
| 10, 11 Cross products | The cross product |
| 12 Cramer's rule | Cramer's rule |
| 13 Change of basis | Change of basis (with B⁻¹MB) |
| 14 Eigenvectors and eigenvalues | Eigenvectors |
| 15 A quick trick for eigenvalues | Eigenvectors (readouts m, p, m² − p) |
| 16 Abstract vector spaces | Functions as vectors |
| 4 (entry by entry) | Multiplying matrices |
| 14 in 3D | Eigenvectors in 3D |
| extras | Projection and least squares, Iterate, Phase portraits, LU, QR, SVD, Data and principal components, Compressing an image, Complex numbers as matrices, The Fourier basis, Drawing with circles, Fractals from four matrices, Four dimensions |

Also: challenges on most lenses (a target to hit, checked live), PNG and video export of the scene, a bottom-sheet layout on phones, share links that encode the whole scene.

## Run

    npm install
    npm run dev

## Test

    npm test                 # vitest: unit tests for every maths module (2x2, 3x3, SVD, PCA, Fourier, IFS, flows, 4D)
    python scripts/e2e.py    # optional, needs playwright + a running `npm run preview`: walks every lens, drags, scrubs, clicks, checks for errors

## Build

    npm run build     # output in dist/, deploy to any static host

## Layout

- `src/math/mat2.ts`  pure 2x2 maths: compose, interpolate, eigen, SVD
- `src/math/mat3.ts`  3x3 maths: determinant, cross product, rank
- `src/math/eig3.ts`  real eigenpairs of a 3x3 via the cubic
- `src/math/svdn.ts`  Jacobi SVD for images, rank-k reconstruction
- `src/math/pca.ts`   covariance and principal components
- `src/math/hyper.ts` 4D rotations and the tesseract
- `src/math/fourier.ts` resampling, DFT epicycles
- `src/math/ifs.ts`   iterated function systems (fern, Sierpinski, dragon, tree)
- `src/math/flow.ts`  phase-portrait classification
- `src/state/challenges.ts` per-lens challenges and their checks
- `src/scene/painter3.ts` orthographic 3D camera on top of the 2D painter (orbit by dragging)
- `src/state/store.ts` zustand store: matrix stack, scene objects, lens, time, share links
- `src/state/lenses.ts` lens registry: titles, hints, stage counts, which handles are draggable
- `src/scene/painter.ts` canvas primitives (arrows, grids, bands, labels)
- `src/scene/lenses.ts` per-lens matrix-at-time and drawing
- `src/scene/Scene.tsx` canvas host and pointer interaction (drag, draw)
- `src/panel/Panel.tsx` side panel: matrices, presets, objects, readouts
- `src/App.tsx` shell, playback, keyboard shortcuts (space = play, enter/esc while drawing)

## Adding a lens

Add an id to `src/state/lenses.ts`, a `case` in `matrixAt` and `draw` in `src/scene/lenses.ts`, and any readouts or factor matrices in `src/panel/Panel.tsx`.

## Ideas to add next

- A 3D lens (three.js) for span, rank and determinant as volume
- Export the current animation as a GIF
