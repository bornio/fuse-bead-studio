import { BoardSize } from '../types';

/**
 * identifies beads that are structurally unsound.
 * Rule 1: A bead is unstable if it has 0 orthogonal neighbors (floating).
 * Rule 2: A bead is unstable if it is part of a cluster that connects to another cluster ONLY diagonally (weak bridge).
 */
export function findUnstableBeads(cells: number[], width: number, height: number): Set<number> {
  const unstableIndices = new Set<number>();
  const totalCells = width * height;
  
  // Map to store Cluster ID for each cell. 0 = empty/unvisited.
  const clusterMap = new Int32Array(totalCells).fill(0);
  let nextClusterId = 1;

  const getIndex = (x: number, y: number) => y * width + x;
  const isValid = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height;

  const orthogonalDirs = [[0, -1], [0, 1], [-1, 0], [1, 0]]; // Up, Down, Left, Right
  const diagonalDirs = [[-1, -1], [1, -1], [-1, 1], [1, 1]]; // NW, NE, SW, SE

  // 1. Build Orthogonal Clusters (Connected Components)
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] !== 0 && clusterMap[i] === 0) {
      // Start BFS for new cluster
      const clusterId = nextClusterId++;
      const queue = [i];
      clusterMap[i] = clusterId;

      let head = 0;
      while (head < queue.length) {
        const currIdx = queue[head++];
        const cx = currIdx % width;
        const cy = Math.floor(currIdx / width);

        for (const [dx, dy] of orthogonalDirs) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (isValid(nx, ny)) {
            const nIdx = getIndex(nx, ny);
            // If neighbor has a bead and not visited
            if (cells[nIdx] !== 0 && clusterMap[nIdx] === 0) {
              clusterMap[nIdx] = clusterId;
              queue.push(nIdx);
            }
          }
        }
      }
    }
  }

  // 2. Analyze Structural Integrity
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === 0) continue;

    const x = i % width;
    const y = Math.floor(i / width);
    const myClusterId = clusterMap[i];
    
    // Check 1: Isolation
    // Does it have ANY orthogonal neighbors? 
    // If 0, it's a single floating bead or a pure diagonal line, which is weak.
    let orthogonalNeighborCount = 0;
    for (const [dx, dy] of orthogonalDirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (isValid(nx, ny)) {
        const nIdx = getIndex(nx, ny);
        if (cells[nIdx] !== 0) {
          orthogonalNeighborCount++;
        }
      }
    }

    if (orthogonalNeighborCount === 0) {
      unstableIndices.add(i);
      continue; // Already marked, move to next
    }

    // Check 2: Weak Bridges
    // Check diagonal neighbors. If we touch a bead from a DIFFERENT cluster,
    // it means two solid pieces are touching only by a corner. This is a weak spot.
    for (const [dx, dy] of diagonalDirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (isValid(nx, ny)) {
        const nIdx = getIndex(nx, ny);
        if (cells[nIdx] !== 0) {
          const neighborClusterId = clusterMap[nIdx];
          // If neighbor exists but is in a different orthogonal cluster
          if (neighborClusterId !== myClusterId) {
             unstableIndices.add(i);
             // We found a weak link, mark it and move on.
             break; 
          }
        }
      }
    }
  }

  return unstableIndices;
}