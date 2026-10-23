export type Lens =
  | 'vector' | 'add' | 'dot' | 'duality'
  | 'matvec' | 'transform' | 'determinant' | 'inverse'
  | 'span' | 'subspaces' | 'basis' | 'project' | 'cramer'
  | 'transform3' | 'nonsquare' | 'cross'
  | 'eigen' | 'iterate'
  | 'lu' | 'qr' | 'svd'
  | 'multiply' | 'eigen3' | 'pca' | 'compress' | 'complex' | 'fourier' | 'hyper'
  | 'epicycles' | 'flow' | 'fractal'
  | 'spaces'

export type Group = { name: string; lenses: Lens[] }

export type LensMeta = {
  id: Lens
  title: string
  /** One sentence shown under the title. */
  hint: string
  /** Plain-language explanation, a few short paragraphs. */
  story: string[]
  /** Concrete things to try on the canvas. */
  tryThis: string[]
  /** Short definitions of the words this lens uses. */
  terms: { term: string; meaning: string }[]
  tMax: (ctx: { stackLength: number; steps: number }) => number
  handles: ('basis' | 'columns' | 'probe' | 'probe2' | 'u3' | 'v3' | 'cols3')[]
  needsCircle?: boolean
  /** Chapter of 3Blue1Brown's Essence of linear algebra this lens follows. */
  chapter?: number
  is3d?: boolean
}

export const GROUPS: Group[] = [
  { name: 'Vectors', lenses: ['vector', 'add', 'dot', 'duality'] },
  { name: 'Matrices', lenses: ['matvec', 'transform', 'multiply', 'determinant', 'inverse'] },
  { name: 'Structure', lenses: ['span', 'subspaces', 'basis', 'project', 'cramer'] },
  { name: '3D', lenses: ['transform3', 'nonsquare', 'cross', 'eigen3'] },
  { name: 'Eigen', lenses: ['eigen', 'iterate', 'flow'] },
  { name: 'Factorisations', lenses: ['lu', 'qr', 'svd'] },
  { name: 'Data', lenses: ['pca', 'compress'] },
  { name: 'Beyond', lenses: ['spaces', 'complex', 'fourier', 'epicycles', 'fractal', 'hyper'] },
]

export const LENS_ORDER: Lens[] = GROUPS.flatMap((g) => g.lenses)

export const LENSES: Record<Lens, LensMeta> = {
  vector: {
    id: 'vector', chapter: 1, title: 'A vector',
    hint: 'An arrow from the origin. Two numbers say where its tip is.',
    story: [
      'Start here if everything is new. A vector is just an arrow that starts at the centre of the grid, the origin. To describe it you only need two numbers: how far right it goes and how far up it goes. We write them as (x, y).',
      'Those two numbers are the whole vector. Change them and the arrow changes; move the arrow and the numbers change. Negative numbers mean left or down.',
      'Everything else in linear algebra is built from arrows like this one, so take a moment to get comfortable with it.',
    ],
    tryThis: [
      'Drag the tip of v around and watch the two numbers follow it.',
      'Put the tip exactly on a grid corner (hold shift to snap) and read its coordinates.',
      'Make v point straight left. One number becomes negative, the other is zero.',
    ],
    terms: [
      { term: 'vector', meaning: 'an arrow from the origin, described by its coordinates' },
      { term: 'origin', meaning: 'the point (0, 0) where the two axes cross' },
      { term: 'length', meaning: 'how long the arrow is, by Pythagoras: the square root of x² + y²' },
    ],
    tMax: () => 1, handles: ['probe'],
  },
  add: {
    id: 'add', chapter: 2, title: 'Adding and scaling',
    hint: 'Walk along u, then along v. Where you end up is u + v. Scaling stretches an arrow.',
    story: [
      'To add two vectors, walk along the first, then continue along the second. The arrow from the origin to where you stop is the sum. Press play to watch v slide over to the tip of u.',
      'To scale a vector, multiply both of its numbers by the same amount. 2v is twice as long in the same direction. A negative number flips it to point the other way.',
      'Adding and scaling are the only two moves in linear algebra. Everything else is some combination of them.',
    ],
    tryThis: [
      'Drag u and v so they point the same way. The sum is simply longer.',
      'Point them in opposite directions with the same length. The sum vanishes.',
      'Slide the scale slider below zero and watch v flip.',
    ],
    terms: [
      { term: 'sum', meaning: 'u + v, found by placing v at the tip of u' },
      { term: 'scalar', meaning: 'a plain number used to stretch or shrink a vector' },
      { term: 'linear combination', meaning: 'any mix of scaled vectors added together, like 2u + 3v' },
    ],
    tMax: () => 1, handles: ['probe', 'probe2'],
  },
  dot: {
    id: 'dot', chapter: 9, title: 'The dot product',
    hint: 'One number that says how much two arrows agree. Zero means perpendicular.',
    story: [
      'The dot product takes two vectors and gives back a single number: multiply the x parts, multiply the y parts, and add. Written u · v.',
      'That number has a picture. Drop a perpendicular from the tip of v onto the line of u: the shadow. The dot product is the length of u times the length of that shadow. It is positive when the arrows roughly agree, zero when they are at right angles, negative when they oppose.',
      'This one number is how we measure angles, lengths and similarity in any dimension, even ones we cannot draw.',
    ],
    tryThis: [
      'Rotate v until the dot product reads zero. The arrows are now perpendicular.',
      'Point both arrows the same way. The dot product is just the two lengths multiplied.',
      'Drag v onto u. You get the length of u squared.',
    ],
    terms: [
      { term: 'dot product', meaning: 'u · v = uₓvₓ + u_yv_y, also |u||v|cos θ' },
      { term: 'perpendicular', meaning: 'at right angles; the dot product is zero' },
      { term: 'projection', meaning: 'the shadow of one vector on the line of another' },
    ],
    tMax: () => 1, handles: ['probe', 'probe2'],
  },
  matvec: {
    id: 'matvec', chapter: 3, title: 'A matrix times a vector',
    hint: 'A matrix is two arrows in a box. Multiplying mixes them using the numbers in x.',
    story: [
      'A 2 by 2 matrix is just two vectors standing side by side: its columns. The first column says where the arrow (1, 0) goes, the second says where (0, 1) goes.',
      'To multiply a matrix by a vector x = (x₁, x₂), take x₁ of the first column plus x₂ of the second column. That is it. The result is written Ax, and it is a linear combination of the columns.',
      'Press play to watch the path: first x₁ steps along column one, then x₂ steps along column two. Everything a matrix does comes from this one rule.',
    ],
    tryThis: [
      'Set x to (1, 0). The result is exactly the first column.',
      'Set x to (1, 1). The result is the two columns added.',
      'Drag the column tips (the î and ĵ arrows) and watch Ax follow.',
    ],
    terms: [
      { term: 'matrix', meaning: 'a grid of numbers; here, two columns that are vectors' },
      { term: 'column', meaning: 'a vertical pair of numbers in the matrix, read as a vector' },
      { term: 'Ax', meaning: 'the matrix A applied to the vector x' },
    ],
    tMax: () => 1, handles: ['columns', 'probe'],
  },
  transform: {
    id: 'transform', chapter: 3, title: 'Transform the plane',
    hint: 'Apply the matrix to every point at once. Grid lines stay straight and evenly spaced.',
    story: [
      'Instead of one vector, apply the matrix to every point on the grid. The grid bends, but in a very tidy way: straight lines stay straight, parallel lines stay parallel, and the origin stays put. That tidiness is what the word linear means.',
      'You only need to watch two arrows, î and ĵ, the columns. Everything else is carried along with them. The shaded square shows how much area gets stretched: that number is the determinant. If it goes negative, the plane has been flipped over.',
      'Stack a second matrix and they apply one after another. The product of two matrices is just this: do one, then the other, and read off where î and ĵ end up. Order matters: swapping them usually gives a different result.',
      'For contrast, the "Not linear" toggle warps the grid with curves. No matrix can do that.',
    ],
    tryThis: [
      'Drag ĵ until it lies on top of î. The whole plane collapses onto a line and the determinant reads zero.',
      'Try the Rotate preset, then the Reflect preset. Only one of them flips the orientation.',
      'Add a second matrix, play, then swap their order with the arrows.',
    ],
    terms: [
      { term: 'linear transformation', meaning: 'a map that keeps lines straight and the origin fixed' },
      { term: 'determinant', meaning: 'the factor by which areas are scaled, negative if flipped' },
      { term: 'composition', meaning: 'applying one matrix after another; written as a product' },
    ],
    tMax: ({ stackLength }) => stackLength, handles: ['basis'],
  },
  inverse: {
    id: 'inverse', chapter: 7, title: 'Undoing it',
    hint: 'Apply the matrix, then its inverse, and everything comes home.',
    story: [
      'If a matrix stretches and twists the plane, its inverse untwists and unstretches it. Doing one then the other leaves everything exactly where it started. We write the inverse as A⁻¹.',
      'Not every matrix has one. If the determinant is zero the plane was squashed onto a line, and two different points landed on the same spot. There is no way to tell them apart afterwards, so there is nothing to undo.',
      'Solving the equation Ax = b means: which x lands on b? Drag b and the answer x = A⁻¹b is drawn with it. When there is no inverse, b must happen to lie on the column space for any solution to exist.',
    ],
    tryThis: [
      'Play and watch the grid go out and come back.',
      'Load the Squash preset. The inverse disappears because information was lost.',
      'Drag b around. The x that solves Ax = b follows it.',
    ],
    terms: [
      { term: 'inverse', meaning: 'the matrix that undoes A, so A⁻¹A is the identity' },
      { term: 'identity', meaning: 'the matrix that does nothing: columns (1, 0) and (0, 1)' },
      { term: 'singular', meaning: 'having determinant zero, so no inverse exists' },
    ],
    tMax: () => 2, handles: ['probe'],
  },
  span: {
    id: 'span', chapter: 2, title: 'Span',
    hint: 'Everything you can reach by scaling and adding your vectors.',
    story: [
      'Take a few vectors. Scale them, add them, in every possible way. The set of all places you can reach is their span.',
      'One vector only spans a line. Two vectors usually span the whole plane, unless they happen to point along the same line, in which case they are no better than one. That is what independent means: each vector adds a new direction.',
      'Drag the target. If it lies in the span, the path shows exactly how to build it from your vectors.',
    ],
    tryThis: [
      'Add one vector. The shaded line is all you can reach.',
      'Add a second one. Now the whole plane is shaded, and the target can be built from the two.',
      'Drag the second vector onto the line of the first. The plane shrinks back to a line.',
    ],
    terms: [
      { term: 'span', meaning: 'every linear combination of a set of vectors' },
      { term: 'independent', meaning: 'no vector in the set can be built from the others' },
      { term: 'dimension', meaning: 'how many independent directions a span has' },
    ],
    tMax: () => 1, handles: ['probe'],
  },
  subspaces: {
    id: 'subspaces', chapter: 7, title: 'Column space and null space',
    hint: 'Where everything lands, and what gets crushed to zero.',
    story: [
      'Apply a matrix to the whole plane. The set of outputs is the column space: the span of the columns. Usually that is the whole plane again.',
      'When the columns point along one line, every output lands on that line. Some input direction got squashed completely to zero: that direction is the null space. Rank counts the dimensions you keep; nullity counts the ones you lose, and they always add up to two.',
      'This is the first glimpse of the big picture: a matrix keeps some directions and throws others away.',
    ],
    tryThis: [
      'Load the Squash preset and play. Watch the plane fold onto the column space.',
      'Drag the column tips apart again. The rank returns to two.',
      'Try to find a matrix with rank zero.',
    ],
    terms: [
      { term: 'column space', meaning: 'all possible outputs Ax, the span of the columns' },
      { term: 'null space', meaning: 'all inputs that A sends to zero' },
      { term: 'rank', meaning: 'the dimension of the column space' },
    ],
    tMax: () => 1, handles: ['basis'],
  },
  basis: {
    id: 'basis', chapter: 13, title: 'Change of basis',
    hint: 'Same arrow, different ruler.',
    story: [
      'Coordinates depend on which arrows you measure with. Normally we measure with î and ĵ. But any two independent vectors can be a ruler, a basis.',
      'The columns of the matrix are a new basis, b₁ and b₂. The dashed path shows the coordinates of v measured in it: how many b₁ steps, then how many b₂ steps. The arrow has not moved; only the description changed.',
      'To describe a transformation M in the new basis: translate into our language with B, apply M, translate back with B⁻¹. The readout shows B⁻¹ M B for M = a 90° rotation. Eigenvectors are exactly a basis in which a matrix becomes simple.',
    ],
    tryThis: [
      'Set the matrix to the identity. The two coordinate readouts agree.',
      'Drag v onto b₁. Its new coordinates become (1, 0).',
      'Double the first column. The first new coordinate halves.',
    ],
    terms: [
      { term: 'basis', meaning: 'a set of independent vectors used to measure everything else' },
      { term: 'coordinates', meaning: 'the amounts of each basis vector needed to build a vector' },
      { term: 'standard basis', meaning: 'î = (1, 0) and ĵ = (0, 1)' },
    ],
    tMax: () => 1, handles: ['columns', 'probe'],
  },
  project: {
    id: 'project', title: 'Projection and least squares',
    hint: 'The closest point on a line, and the leftover that is perpendicular.',
    story: [
      'Suppose you want to reach b but you can only move along one line. The best you can do is the point on the line closest to b: its projection. The leftover, from the projection to b, sticks out at a right angle.',
      'That is least squares, the method behind fitting lines to data. The data is b, the line is what the model can produce, and the projection is the best fit.',
      'There is even a matrix P that does the projecting. Apply it twice and nothing more happens: once you are on the line, you stay there.',
    ],
    tryThis: [
      'Drag b onto the line. The error drops to zero.',
      'Drag b perpendicular to the line. The projection is the origin.',
      'Rotate the line by dragging the tip of a. The right-angle mark follows.',
    ],
    terms: [
      { term: 'projection', meaning: 'the closest point on a line or plane' },
      { term: 'residual', meaning: 'the error vector from the projection to b' },
      { term: 'least squares', meaning: 'choosing the fit that makes the residual as short as possible' },
    ],
    tMax: () => 1, handles: ['columns', 'probe'],
  },
  eigen: {
    id: 'eigen', chapter: 14, title: 'Eigenvectors',
    hint: 'Directions the matrix only stretches, never turns.',
    story: [
      'Most arrows get knocked off their line when a matrix acts. A few special ones do not: they come out longer or shorter, maybe flipped, but still pointing along the same line. Those are the eigenvectors, and the stretch factor is the eigenvalue λ.',
      'Drag v around. When its image Av lines up with it, both arrows thicken and λ appears. The faint dashed lines mark where this happens.',
      'Some matrices, like pure rotations, have no such directions in the real plane: every arrow turns. Then the eigenvalues are complex numbers, which is the algebra remembering the rotation.',
      'A quick way to find eigenvalues of a 2 by 2: the mean of the diagonal m = tr/2 and the product p = det. Then λ = m ± √(m² − p). The readouts show the pieces.',
      'If you use the eigenvectors as a basis, the matrix becomes diagonal: it only stretches. That is diagonalisation, and it is why powers of a matrix are easy once you know its eigenvectors.',
    ],
    tryThis: [
      'Find both eigen-directions by sweeping v around the circle.',
      'Load the Stretch preset: a symmetric matrix always has two perpendicular eigenvectors.',
      'Load the Rotate preset. There is no direction to find.',
    ],
    terms: [
      { term: 'eigenvector', meaning: 'a vector whose direction A does not change' },
      { term: 'eigenvalue', meaning: 'the factor λ by which that eigenvector is scaled' },
      { term: 'characteristic polynomial', meaning: 'the equation whose roots are the eigenvalues' },
      { term: 'eigenbasis', meaning: 'a basis of eigenvectors; in it the matrix is diagonal' },
    ],
    tMax: () => 1, handles: ['probe'],
  },
  iterate: {
    id: 'iterate', title: 'Apply it again and again',
    hint: 'Repeated multiplication is pulled toward the dominant eigenvector.',
    story: [
      'Apply the matrix once, twice, ten times. Whatever vector you start from, the sequence swings toward the eigenvector with the largest eigenvalue, because that direction grows fastest and drowns out the rest. This is power iteration, and it is how search engines rank pages.',
      'A Markov matrix, whose columns add to one, settles to a steady state instead of growing. A matrix with complex eigenvalues has no favourite direction, so the sequence spirals.',
      'With normalising on, each step is rescaled so only the direction matters. Turn it off to see the true growth or decay.',
    ],
    tryThis: [
      'Load the Markov preset and play. The dots settle onto one line.',
      'Load the Spiral preset. The dots loop around the origin.',
      'Switch normalising off on the Stretch preset and watch the arrow run away.',
    ],
    terms: [
      { term: 'power iteration', meaning: 'repeatedly applying A to find the dominant eigenvector' },
      { term: 'Markov matrix', meaning: 'non-negative entries, each column summing to one' },
      { term: 'steady state', meaning: 'a vector that the matrix leaves unchanged, eigenvalue one' },
    ],
    tMax: ({ steps }) => steps, handles: ['probe'],
  },
  lu: {
    id: 'lu', title: 'LU: row reduction as shears',
    hint: 'Any matrix is an upper-triangular part followed by a lower-triangular shear.',
    story: [
      'Solving equations by hand means subtracting multiples of one row from another. Each of those steps is a shear, a matrix that slides the plane sideways. Collect them and you get A = L U.',
      'U is upper triangular: zeros below the diagonal. L is lower triangular with ones on the diagonal, and it records the row operations you did. Solving with L and U separately is fast, which is why computers factor first.',
      'Sometimes the first pivot is zero and you must swap rows first. That is the P.',
    ],
    tryThis: [
      'Play and watch U act, then L finish the job.',
      'Set the top-left entry to zero. A row swap appears.',
      'Multiply the L and U readouts by hand and check you get A.',
    ],
    terms: [
      { term: 'triangular', meaning: 'all zeros above or below the diagonal' },
      { term: 'pivot', meaning: 'the entry you divide by during elimination' },
      { term: 'shear', meaning: 'a transformation that slides layers sideways, keeping area' },
    ],
    tMax: () => 2, handles: ['columns'],
  },
  qr: {
    id: 'qr', title: 'QR: making things perpendicular',
    hint: 'Gram-Schmidt: keep one direction, subtract its shadow from the next.',
    story: [
      'Two columns that lean on each other are awkward. Gram-Schmidt straightens them out. Keep the first direction and shrink it to length one: that is q₁. Then take the second column, subtract its shadow on q₁, and what remains is perpendicular. Shrink that to length one: q₂.',
      'The perpendicular unit vectors go in Q. The amounts you shrank and subtracted go in R, which is upper triangular. So A = Q R.',
      'Perpendicular bases make everything easier, and QR is the workhorse behind least squares and finding eigenvalues numerically.',
    ],
    tryThis: [
      'Scrub slowly through the three stages.',
      'Drag a₂ perpendicular to a₁. The shadow vanishes and R becomes diagonal.',
      'Drag a₂ onto the line of a₁. There is no second direction left.',
    ],
    terms: [
      { term: 'orthonormal', meaning: 'perpendicular to each other and length one' },
      { term: 'Gram-Schmidt', meaning: 'the subtract-the-shadow procedure' },
      { term: 'Q', meaning: 'a matrix whose columns are orthonormal, so Qᵀ Q is the identity' },
    ],
    tMax: () => 3, handles: ['columns'],
  },
  svd: {
    id: 'svd', title: 'SVD: rotate, stretch, rotate',
    hint: 'The unit circle always becomes an ellipse. SVD names its axes.',
    story: [
      'Whatever the matrix does, it sends the unit circle to an ellipse. The singular value decomposition says why: first rotate the plane (Vᵀ), then stretch along the axes by σ₁ and σ₂ (Σ), then rotate again (U).',
      'The stretch factors are the singular values. They tell you how much the matrix can amplify a vector at most, and at least. A singular value of zero means a direction was flattened, which is rank again.',
      'This works for any matrix of any shape, which is why SVD sits underneath image compression, recommendation systems and principal component analysis.',
    ],
    tryThis: [
      'Scrub through rotate, stretch, rotate and watch the circle become the ellipse.',
      'Load the Reflect preset. One singular value comes with a flip.',
      'Load the Squash preset. σ₂ drops to zero and the ellipse collapses.',
    ],
    terms: [
      { term: 'singular values', meaning: 'the stretch factors σ₁ ≥ σ₂ ≥ 0' },
      { term: 'U and V', meaning: 'rotations (or reflections) before and after the stretch' },
      { term: 'low rank approximation', meaning: 'keeping only the largest singular values' },
    ],
    tMax: () => 3, handles: [], needsCircle: true,
  },
  duality: {
    id: 'duality', chapter: 9, title: 'Duality',
    hint: 'A 1 by 2 matrix squishes the plane onto a number line. It is secretly a vector.',
    story: [
      'A matrix with one row and two columns takes a 2D vector and gives back a single number. Geometrically it squishes the whole plane onto a line. Where do î and ĵ land? At two numbers, which are the two entries of the matrix.',
      'Stand those two numbers up and you have a vector u. Applying the 1 by 2 matrix to any v gives exactly the dot product u · v. The dashed line is the number line, tilted so that its unit tick sits at û.',
      'This is duality: every linear map from the plane to the numbers is really a vector, and the dot product is that map in disguise. It is why the dot product has both an algebraic formula and a projection picture.',
    ],
    tryThis: [
      'Drag u. The tick marks on the number line turn with it, and the entries of the 1 by 2 matrix change.',
      'Drag v onto the dashed line. Its number is just its distance from the origin times |u|.',
      'Put v perpendicular to the line. Its number is zero.',
    ],
    terms: [
      { term: 'linear functional', meaning: 'a linear map from vectors to single numbers' },
      { term: 'dual vector', meaning: 'the vector whose dot product computes a functional' },
      { term: 'transpose', meaning: 'turning a column into a row, written uᵀ' },
    ],
    tMax: () => 1, handles: ['probe', 'probe2'],
  },
  determinant: {
    id: 'determinant', chapter: 6, title: 'The determinant',
    hint: 'How much a transformation scales area, and whether it flips the plane.',
    story: [
      'Watch the unit square. After the matrix acts it is a parallelogram, and the determinant is its area. Every other region scales by the same factor, so one number describes the whole stretch.',
      'If the determinant is negative, the plane was turned over, like flipping a sheet of paper: ĵ moves from the left of î to its right. If it is zero, the square was flattened onto a line and the transformation lost a dimension.',
      'For two matrices in a row, the areas multiply: det(AB) = det(A) det(B). Stack a second matrix to see it.',
    ],
    tryThis: [
      'Drag ĵ across î and watch the sign change the moment they line up.',
      'Set the matrix to a pure rotation. The area is exactly one.',
      'Add a second matrix and compare the product of the two determinants with the determinant of the product.',
    ],
    terms: [
      { term: 'determinant', meaning: 'the signed area scale factor of a transformation' },
      { term: 'orientation', meaning: 'which side of î the vector ĵ sits on' },
      { term: 'ad − bc', meaning: 'the formula for a 2 by 2 determinant' },
    ],
    tMax: ({ stackLength }) => stackLength, handles: ['basis'],
  },
  cramer: {
    id: 'cramer', chapter: 12, title: "Cramer's rule",
    hint: 'Solve Ax = b by comparing areas.',
    story: [
      'The parallelogram spanned by î and the unknown x has area equal to the y coordinate of x. After the transformation that parallelogram becomes the one spanned by the first column and b, and its area has been scaled by the determinant.',
      'So y = area(column 1, b) divided by det(A), and the same trick with ĵ gives x. Each coordinate of the solution is a ratio of two determinants. That is Cramer\u2019s rule.',
      'It is slow for big systems, but it is the clearest picture of why determinants and solving equations are the same subject.',
    ],
    tryThis: [
      'Drag b. The two parallelograms change together and the ratio stays honest.',
      'Load the Squash preset. The determinant is zero and the rule breaks.',
      'Make b equal to the first column. The solution is x = (1, 0).',
    ],
    terms: [
      { term: 'Cramer\u2019s rule', meaning: 'each coordinate of x is a ratio of determinants' },
      { term: 'signed area', meaning: 'area counted negative when the order is flipped' },
    ],
    tMax: () => 1, handles: ['columns', 'probe'],
  },
  transform3: {
    id: 'transform3', chapter: 5, title: 'Three dimensions',
    hint: 'Same idea, one more arrow. The columns say where î, ĵ and k̂ land.',
    story: [
      'In three dimensions a matrix has three columns, one for each basis vector. Everything else follows the same rule: a vector is a mix of î, ĵ and k̂, so its image is the same mix of the three columns.',
      'The cube shows what happens to volume: the determinant is now a volume scale factor, negative if the space has been turned inside out, zero if it was flattened onto a plane or a line.',
      'Drag the background to orbit the camera, and drag the tips of î, ĵ and k̂ to reshape the box directly. Linear transformations in 3D are what computer graphics and robotics use for every rotation and stretch.',
    ],
    tryThis: [
      'Set the matrix to the identity and orbit around the cube.',
      'Make the third column equal to the first. The cube flattens and the determinant reads zero.',
      'Try a rotation about the z axis: only the top-left 2 by 2 block changes.',
    ],
    terms: [
      { term: 'k̂', meaning: 'the third basis vector, (0, 0, 1)' },
      { term: 'volume', meaning: 'the 3D determinant scales volumes' },
      { term: 'rank', meaning: 'the dimension of the output: 3, a plane, a line, or a point' },
    ],
    tMax: () => 1, handles: ['cols3'], is3d: true,
  },
  nonsquare: {
    id: 'nonsquare', chapter: 8, title: 'Nonsquare matrices',
    hint: 'Three rows and two columns: the plane lands on a slanted plane inside 3D.',
    story: [
      'A 3 by 2 matrix still has one column per input basis vector, but each column has three entries. So î and ĵ land somewhere in 3D space, and the whole input plane is carried onto the plane they span.',
      'The output is 3D but the image is only two-dimensional: the column space is a plane through the origin. A 2 by 3 matrix goes the other way, flattening 3D space onto the plane, so some input direction is lost in the null space.',
      'Shape tells you the story: rows are the output dimension, columns are the input dimension.',
    ],
    tryThis: [
      'Orbit until you look along the output plane: the grid becomes a line.',
      'Make both columns lie in the ground plane. The output plane is the floor.',
      'Make the columns parallel. The plane collapses to a line, rank one.',
    ],
    terms: [
      { term: 'm × n', meaning: 'm rows (output dimension), n columns (input dimension)' },
      { term: 'embedding', meaning: 'placing a lower dimensional space inside a higher one' },
    ],
    tMax: () => 1, handles: [], is3d: true,
  },
  cross: {
    id: 'cross', chapter: 10, title: 'The cross product',
    hint: 'A vector perpendicular to both, as long as the parallelogram is wide.',
    story: [
      'In 2D the cross product of u and v is a number: the signed area of their parallelogram, which is the determinant of the matrix with u and v as columns. Positive when v is anticlockwise from u.',
      'In 3D it becomes a vector: perpendicular to both u and v, with length equal to that area, pointing by the right-hand rule. Drag u or v in the view and watch it swing.',
      'Chapter 11 explains the formula through duality: the map x ↦ det[x u v] is linear in x, so it must be the dot product with some vector. That vector is u × v.',
    ],
    tryThis: [
      'Make u and v parallel. The cross product shrinks to nothing.',
      'Make them perpendicular with length one. The cross product has length one.',
      'Swap u and v. The cross product flips.',
    ],
    terms: [
      { term: 'cross product', meaning: 'u × v, perpendicular to both, length = parallelogram area' },
      { term: 'right-hand rule', meaning: 'fingers along u curl toward v, thumb gives u × v' },
      { term: 'normal vector', meaning: 'a vector perpendicular to a plane' },
    ],
    tMax: () => 1, handles: ['u3', 'v3'], is3d: true,
  },
  spaces: {
    id: 'spaces', chapter: 16, title: 'Functions as vectors',
    hint: 'Anything you can add and scale is a vector. The derivative is a matrix.',
    story: [
      'Vectors do not have to be arrows. Polynomials can be added and scaled, so they form a vector space too. A cubic a + bx + cx² + dx³ is the vector (a, b, c, d) in the basis 1, x, x², x³.',
      'Taking the derivative is linear: the derivative of a sum is the sum of derivatives. So it has a matrix. In this basis it is the 4 by 4 matrix shown in the panel. Multiply it by the coefficient vector and you get the coefficients of f′.',
      'This is the point of the abstract view: every rule about matrices, eigenvectors and all, applies to any space where adding and scaling make sense. Functions, images, sound, probability.',
    ],
    tryThis: [
      'Slide the coefficients and watch f and f′ change together.',
      'Set every coefficient but d to zero. The derivative of x³ is 3x², read it off the matrix.',
      'Find a function whose derivative is zero everywhere. That is the null space.',
    ],
    terms: [
      { term: 'vector space', meaning: 'any collection where adding and scaling behave sensibly' },
      { term: 'linear operator', meaning: 'a linear map from a space to itself, like differentiation' },
      { term: 'basis functions', meaning: '1, x, x², x³ here; every cubic is a combination of them' },
    ],
    tMax: () => 1, handles: ['probe'],
  },
  multiply: {
    id: 'multiply', chapter: 4, title: 'Multiplying matrices',
    hint: 'Each entry of BA is a row of B dotted with a column of A. Watch the grid move while the cells fill in.',
    story: [
      'Applying A then B is itself a linear transformation, so it has a matrix. To find it, ask where î lands after both: take the first column of A and push it through B. That is the first column of the product. Same for ĵ.',
      'Entry by entry, the number in row i, column j of the product is row i of B dotted with column j of A. The panel highlights the row and column that make the current cell while the canvas shows the same column of A being carried by B.',
      'This is why the product is written BA when A acts first: read right to left, like function composition. And it is why AB and BA usually differ.',
    ],
    tryThis: [
      'Scrub slowly: four cells, four row-times-column sums.',
      'Swap A and B with the arrows and compare the two products.',
      'Make B the identity. The product is just A.',
    ],
    terms: [
      { term: 'matrix product', meaning: 'the matrix of one transformation followed by another' },
      { term: 'row times column', meaning: 'the dot product that produces one entry' },
      { term: 'non-commutative', meaning: 'AB and BA are generally different' },
    ],
    tMax: () => 4, handles: [],
  },
  eigen3: {
    id: 'eigen3', chapter: 14, title: 'Eigenvectors in 3D',
    hint: 'A 3D rotation always has an axis: a line the matrix leaves alone.',
    story: [
      'In three dimensions the eigenvector picture gains a famous example. Every rotation has an axis, and that axis is an eigenvector with eigenvalue one: it is the only line that does not move.',
      'A 3 by 3 matrix has a cubic characteristic polynomial, which always has at least one real root, so there is always at least one real eigen-direction. The other two may be real or a complex pair, as in 2D.',
      'Drag the probe v. Its image Av thickens when the two line up. The dashed lines are the eigen-directions found numerically.',
    ],
    tryThis: [
      'Load the Rotate z preset. The axis is k̂, eigenvalue one.',
      'Load Stretch. Three perpendicular eigen-directions, three different stretches.',
      'Set a column to zero and see an eigenvalue of zero appear.',
    ],
    terms: [
      { term: 'axis of rotation', meaning: 'the eigenvector with eigenvalue 1 of a rotation matrix' },
      { term: 'cubic', meaning: 'a degree 3 polynomial, always with a real root' },
    ],
    tMax: () => 1, handles: ['u3', 'cols3'], is3d: true,
  },
  pca: {
    id: 'pca', title: 'Data and principal components',
    hint: 'Click to add points. The ellipse is their covariance; its long axis is the first principal component.',
    story: [
      'Measure two things about many objects and plot them. The cloud leans in some direction. The covariance matrix records how the two measurements vary together, and its eigenvectors are the axes of the cloud.',
      'The eigenvector with the largest eigenvalue is the first principal component: the single direction that captures the most variation. Projecting every point onto it compresses two numbers to one while losing the least information.',
      'With a hundred measurements instead of two, the same eigenvectors find the few directions that matter. That is principal component analysis, and it is linear algebra doing data science.',
    ],
    tryThis: [
      'Click to add points in a diagonal streak. The first component follows the streak.',
      'Drag a point far away and watch the ellipse tilt toward it.',
      'Load a round cloud. The eigenvalues become nearly equal and the direction stops mattering.',
    ],
    terms: [
      { term: 'covariance matrix', meaning: 'a symmetric matrix of variances and covariances' },
      { term: 'principal component', meaning: 'an eigenvector of the covariance matrix' },
      { term: 'variance explained', meaning: 'an eigenvalue as a share of the total' },
    ],
    tMax: () => 1, handles: [],
  },
  compress: {
    id: 'compress', title: 'Compressing an image',
    hint: 'A grayscale image is a matrix. Keep its biggest singular values and the picture survives.',
    story: [
      'A grayscale picture is a grid of numbers, so it is a matrix. Take its SVD and write it as a sum of rank-one layers, each weighted by a singular value. The first layers carry the broad light and dark; later ones carry fine detail.',
      'Slide the rank. With a handful of layers the image is recognisable although you kept only a fraction of the numbers. The bars show the singular values dropping off, which is why it works.',
      'Drop in your own photo to try it. It is shrunk to a small square and turned to grayscale.',
    ],
    tryThis: [
      'Set the rank to 1. You see a single smooth gradient.',
      'Find the smallest rank where you can tell what the picture is.',
      'Compare the numbers kept with the numbers in the original.',
    ],
    terms: [
      { term: 'rank-one matrix', meaning: 'an outer product u vᵀ, one column pattern times one row pattern' },
      { term: 'low-rank approximation', meaning: 'the closest matrix of a given rank, given by the SVD' },
    ],
    tMax: () => 1, handles: [],
  },
  complex: {
    id: 'complex', title: 'Complex numbers as matrices',
    hint: 'Multiplying by a + bi is a rotation and a scaling. It is the matrix [a −b; b a].',
    story: [
      'A complex number z = a + bi can be drawn as the point (a, b). Multiplying any other number by z rotates it by the angle of z and scales it by the length of z.',
      'Rotate-and-scale is linear, so it has a matrix. Its columns are where 1 and i land: 1 goes to (a, b) and i goes to (−b, a). Complex multiplication is this 2 by 2 matrix in disguise.',
      'This is why rotation matrices have complex eigenvalues, and why in 3D the same job needs quaternions: four numbers, because 3D rotations have an axis as well as an angle.',
    ],
    tryThis: [
      'Drag z onto the unit circle. The grid rotates without stretching.',
      'Put z at i. Everything turns a quarter turn.',
      'Put z at −1. A half turn, the same as scaling by −1.',
    ],
    terms: [
      { term: 'complex number', meaning: 'a + bi, drawn as the point (a, b)' },
      { term: 'modulus and argument', meaning: 'the length and angle of a complex number' },
      { term: 'quaternion', meaning: 'the four-dimensional cousin that encodes 3D rotations' },
    ],
    tMax: () => 1, handles: ['probe'],
  },
  fourier: {
    id: 'fourier', title: 'The Fourier basis',
    hint: 'Sines and cosines are perpendicular functions. Any wave is a combination of them.',
    story: [
      'In the space of functions, sin x, sin 2x, sin 3x and so on are perpendicular: the integral of their product is zero. They are an orthonormal basis, like î and ĵ but infinite.',
      'So to write a wave in this basis you take dot products: each coefficient is an integral of the wave times a basis function. Add up the first few terms and the partial sum approaches the wave.',
      'This is the Fourier series. Audio, images and signals are all stored and cleaned this way: project onto the basis, keep the big coefficients, drop the rest.',
    ],
    tryThis: [
      'Increase the number of terms and watch the square wave sharpen.',
      'Switch to the triangle wave. It needs far fewer terms. Its coefficients fall off faster.',
      'Look at the coefficients: for the square wave only odd terms are non-zero.',
    ],
    terms: [
      { term: 'orthogonal functions', meaning: 'functions whose product integrates to zero' },
      { term: 'Fourier coefficient', meaning: 'the dot product of a function with a basis function' },
      { term: 'partial sum', meaning: 'the first N terms added together' },
    ],
    tMax: () => 1, handles: [],
  },
  hyper: {
    id: 'hyper', title: 'Four dimensions',
    hint: 'A 4D cube, rotated in 4D and projected down. The same rules, one more number.',
    story: [
      'Nothing in linear algebra stops at three. A vector in four dimensions is four numbers; a 4 by 4 matrix rotates them. We cannot see 4D directly, so we project: first from 4D to 3D with perspective, then onto the screen.',
      'The shape is a tesseract: sixteen corners, each joined to four others. In 4D there are six planes to rotate in, not three, because every pair of axes gives one. Rotating in a plane that includes w is what makes the inner cube swap places with the outer one.',
      'Everything you learned still applies: the rotation matrix is orthogonal, its determinant is one, and its eigenvalues are complex pairs on the unit circle.',
    ],
    tryThis: [
      'Rotate in the xw plane and watch the inner cube come forward and grow.',
      'Rotate only in xy and yz: that is an ordinary 3D rotation, nothing strange happens.',
      'Drag the background to orbit in 3D while the 4D rotation is playing.',
    ],
    terms: [
      { term: 'tesseract', meaning: 'the 4D cube, with 16 vertices and 32 edges' },
      { term: 'plane of rotation', meaning: 'in n dimensions a rotation turns a plane, not an axis' },
      { term: 'projection', meaning: 'dropping a dimension, here 4D to 3D to 2D' },
    ],
    tMax: () => 1, handles: [], is3d: true,
  },
  epicycles: {
    id: 'epicycles', title: 'Drawing with circles',
    hint: 'Draw any shape. A chain of spinning circles will trace it back. That is a Fourier series.',
    story: [
      'Draw a closed shape with your mouse, or pick one from the panel. We read the drawing as a list of complex numbers, one per moment, and take its Fourier transform: the drawing becomes a sum of pure rotations, each with its own speed, size and starting angle.',
      'Each rotation is a circle. Put them tip to tail, spin them at their own speeds, and the end of the chain redraws your shape. More circles, more detail. The biggest circles carry the rough outline; the tiny fast ones add the corners.',
      'This is the same idea as the Fourier basis of the previous lens, in the plane instead of on a line. Projecting onto rotations is a change of basis, and the sizes of the circles are the coordinates.',
    ],
    tryThis: [
      'Draw a rough circle. One or two circles are enough to reproduce it.',
      'Draw a letter with sharp corners and watch how many circles it takes.',
      'Slide the count down to 3 and see what the "essence" of your shape is.',
    ],
    terms: [
      { term: 'epicycle', meaning: 'a circle whose centre rides on another circle' },
      { term: 'Fourier transform', meaning: 'rewriting a signal as a sum of rotations' },
      { term: 'frequency', meaning: 'how many turns a circle makes per lap of the drawing' },
    ],
    tMax: () => 1, handles: [],
  },
  flow: {
    id: 'flow', chapter: 14, title: 'Phase portraits',
    hint: 'Let every point drift in the direction Ax. The eigenvalues decide the whole picture.',
    story: [
      'Take the matrix as a rule for motion: at every point x, move with velocity Ax. The particles show where everything goes. This is a linear differential equation, and it is how physics describes springs, circuits, populations and orbits near equilibrium.',
      'The shape of the flow is decided entirely by the eigenvalues. Two real eigenvalues of opposite sign make a saddle: in along one eigenvector, out along the other. Both negative pulls everything in. A complex pair makes a spiral, and if the real part is zero the spiral becomes closed loops.',
      'Watch the particles cling to the dashed eigen-directions. Those are the only straight paths.',
    ],
    tryThis: [
      'Load Saddle and watch particles approach along one line and leave along the other.',
      'Load Centre. Nothing is lost or gained: this is a frictionless orbit.',
      'Nudge the matrix off Centre by a tiny amount. Loops become spirals.',
    ],
    terms: [
      { term: 'phase portrait', meaning: 'a picture of all trajectories of a system' },
      { term: 'equilibrium', meaning: 'a point that does not move, here the origin' },
      { term: 'stability', meaning: 'whether nearby points drift toward or away from equilibrium' },
    ],
    tMax: () => 1, handles: ['basis'],
  },
  fractal: {
    id: 'fractal', title: 'Fractals from four matrices',
    hint: 'A fern, a triangle, a dragon: each is the fixed point of a handful of linear maps.',
    story: [
      'Take a few matrices with a shift added, so each squashes and moves the plane. Pick a point, apply a randomly chosen map, repeat thousands of times. The points settle onto a shape that none of the maps alone contains: the attractor.',
      'The Barnsley fern is four such maps. One makes the stem, one makes each leaflet a smaller copy of the whole, two make the lowest pair. The outlined squares are the unit square under each map, so you can see what each one does.',
      'This is self-similarity straight from linear algebra: because every map is a scaled-down copy, the whole shape is made of smaller copies of itself.',
    ],
    tryThis: [
      'Slide bend to twist the main map and watch the fern curl.',
      'Switch to the Sierpinski triangle. Three maps, each halving the plane.',
      'Look at the squares: the one that is almost flat makes the stem.',
    ],
    terms: [
      { term: 'affine map', meaning: 'a linear map followed by a shift' },
      { term: 'attractor', meaning: 'the shape the random iteration settles onto' },
      { term: 'self-similar', meaning: 'made of smaller copies of itself' },
    ],
    tMax: () => 1, handles: [],
  },
}

export const isLens = (x: string): x is Lens => x in LENSES
export const groupOf = (lens: Lens): Group => GROUPS.find((g) => g.lenses.includes(lens))!
