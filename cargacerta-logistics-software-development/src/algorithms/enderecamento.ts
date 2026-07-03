/**
 * CargaCerta v2 - Algoritmo de Endereçamento
 * 
 * Calcula a melhor orientação de caixas dentro de um endereço,
 * testando todas as 6 orientações possíveis e escolhendo
 * a de maior ocupação.
 */

export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

export interface BoxPosition {
  x: number;
  y: number;
  z: number;
  l: number;
  w: number;
  h: number;
}

export interface OrientationResult {
  dims: [number, number, number];
  perm: [number, number, number];
}

export interface AddressingResult {
  bestOrientation: OrientationResult;
  quantity: number;
  fitX: number;
  fitY: number;
  fitZ: number;
  volumeAddress: number;
  volumeOccupied: number;
  volumeFree: number;
  efficiency: number;
  coverage: number;
  boxes: BoxPosition[];
  addressDims: Dimensions;
  boxDims: Dimensions;
}

const PERMUTATIONS: [number, number, number][] = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

export function calculateAddressing(
  address: Dimensions,
  box: Dimensions
): AddressingResult | null {
  const volAddress = address.length * address.width * address.height;
  const boxArr = [box.length, box.width, box.height];
  
  let bestResult: AddressingResult | null = null;
  let bestQuantity = 0;
  let bestEfficiency = 0;

  for (const perm of PERMUTATIONS) {
    const bl = boxArr[perm[0]];
    const bw = boxArr[perm[1]];
    const bh = boxArr[perm[2]];

    if (bl <= 0 || bw <= 0 || bh <= 0) continue;

    const fitX = Math.floor(address.length / bl);
    const fitY = Math.floor(address.width / bw);
    const fitZ = Math.floor(address.height / bh);

    if (fitX === 0 || fitY === 0 || fitZ === 0) continue;

    const quantity = fitX * fitY * fitZ;
    const volOccupied = quantity * box.length * box.width * box.height;
    const volFree = volAddress - volOccupied;
    const eff = (volOccupied / volAddress) * 100;
    const cov = ((fitX * bl * fitY * bw) / (address.length * address.width)) * 100;

    const boxes: BoxPosition[] = [];
    for (let ix = 0; ix < fitX; ix++) {
      for (let iy = 0; iy < fitY; iy++) {
        for (let iz = 0; iz < fitZ; iz++) {
          boxes.push({ x: ix * bl, y: iy * bw, z: iz * bh, l: bl, w: bw, h: bh });
        }
      }
    }

    const result: AddressingResult = {
      bestOrientation: { dims: [bl, bw, bh], perm },
      quantity,
      fitX,
      fitY,
      fitZ,
      volumeAddress: volAddress,
      volumeOccupied: volOccupied,
      volumeFree: volFree,
      efficiency: eff,
      coverage: cov,
      boxes,
      addressDims: { ...address },
      boxDims: { ...box },
    };

    if (quantity > bestQuantity || (quantity === bestQuantity && eff > bestEfficiency)) {
      bestQuantity = quantity;
      bestEfficiency = eff;
      bestResult = result;
    }
  }

  return bestResult;
}

export function getOrientationLabel(perm: [number, number, number], box: Dimensions): string {
  const labels = ['C', 'L', 'A'];
  const dims = [box.length, box.width, box.height];
  return `${labels[perm[0]]}×${labels[perm[1]]}×${labels[perm[2]]} (${dims[perm[0]]}×${dims[perm[1]]}×${dims[perm[2]]})`;
}
