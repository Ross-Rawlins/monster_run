// Quick test of the ground tile generator
const PrimaryGroundTile = {
  TILE_FRAME_NAMES: {
    tile_10: 'Tiles_Ground_Seperated_10',
    tile_9: 'Tiles_Ground_Seperated_9',
    tile_8: 'Tiles_Ground_Seperated_8',
  },
  GROUND_NEIGHBOR_RULES: {
    tile_10: {
      leftAllowed: ['tile_10', 'tile_9'],
      rightAllowed: ['tile_10', 'tile_8'],
    },
    tile_9: {
      leftAllowed: [],
      rightAllowed: ['tile_10'],
    },
    tile_8: {
      leftAllowed: ['tile_10'],
      rightAllowed: [],
    },
  },
};

function hashSeed(x, y, seed) {
  return Math.abs((x * 73856093) ^ (y * 19349663) ^ (seed * 83492791)) >>> 0;
}

function generateGroundRow(chunkWidthTiles, chunkSeed) {
  const row = [];

  for (let col = 0; col < chunkWidthTiles; col++) {
    const seed = hashSeed(col, 0, chunkSeed);

    if (col === 0) {
      row.push(seed % 2 === 0 ? 'tile_10' : 'tile_9');
      continue;
    }

    const prevTile = row[col - 1];
    const allowedRightNeighbors = PrimaryGroundTile.GROUND_NEIGHBOR_RULES[prevTile].rightAllowed;

    if (allowedRightNeighbors.length === 0) {
      row.push('tile_10');
      continue;
    }

    const chosen = allowedRightNeighbors[seed % allowedRightNeighbors.length];
    row.push(chosen);
  }

  return row;
}

function visualizeGroundRow(row, style = 'glyph') {
  if (style === 'names') {
    return row.map((tile) => PrimaryGroundTile.TILE_FRAME_NAMES[tile]).join(' → ');
  }

  const glyphs = {
    tile_10: '[=]',
    tile_9: '[◀]',
    tile_8: '[▶]',
  };

  return row.map((tile) => glyphs[tile]).join('');
}

function validateGroundRow(row) {
  const issues = [];

  for (let col = 0; col < row.length; col++) {
    const tile = row[col];
    const rules = PrimaryGroundTile.GROUND_NEIGHBOR_RULES[tile];

    if (col > 0) {
      const leftTile = row[col - 1];
      const isValid = rules.leftAllowed.includes(leftTile);
      if (!isValid) {
        issues.push(
          `Col ${col}: ${tile} has incompatible left neighbor ${leftTile}`
        );
      }
    }

    if (col < row.length - 1) {
      const rightTile = row[col + 1];
      const isValid = rules.rightAllowed.includes(rightTile);
      if (!isValid) {
        issues.push(
          `Col ${col}: ${tile} has incompatible right neighbor ${rightTile}`
        );
      }
    }
  }

  return issues;
}

// Test
console.log('\n╔' + '═'.repeat(78) + '╗');
console.log('║' + ' PRIMARY GROUND TILES — Randomization Test '.padStart(48) + ' '.repeat(30) + '║');
console.log('╚' + '═'.repeat(78) + '╝\n');

const chunkWidthTiles = 16;
const seeds = [42, 123, 999, 2024, 55555];

seeds.forEach((seed, idx) => {
  console.log(`📍 Chunk ${idx} (seed=${seed})`);
  console.log('─'.repeat(80));

  const row = generateGroundRow(chunkWidthTiles, seed);
  const issues = validateGroundRow(row);

  console.log('Glyphs (compact):');
  console.log('  ' + visualizeGroundRow(row, 'glyph'));

  console.log('\nFrame names:');
  console.log('  ' + visualizeGroundRow(row, 'names'));

  if (issues.length === 0) {
    console.log('\n✅ Valid — all neighbors respect rules');
  } else {
    console.log('\n❌ Issues found:');
    issues.forEach((issue) => console.log(`  • ${issue}`));
  }

  console.log('');
});

console.log('═'.repeat(80));
console.log('✨ Generation complete!\n');
