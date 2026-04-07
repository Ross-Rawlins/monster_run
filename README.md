# Monster Run

This project was bootstrapped with [Phaser CLI][1] and adapted into Monster
Run, a side-scrolling action runner used to validate sprite sheets and gameplay
systems.

## Usage

### Running in Development

```bash
npm start
# or
yarn start
```

### Build for Production

```bash
npm run build
# or
yarn run build
```

## Current Scope

- Loads the skeleton and zombie sprite sheets from the local project asset
  registry.
- Registers a reusable animation map for each character.
- Starts a sandbox scene with a simple floor, gravity, and keyboard controls.
- Lets you swap between the two character definitions without changing scene
  code.

## Controls

- `1`: spawn skeleton
- `2`: spawn zombie
- `Left` / `Right`: move
- `Up` or `Space`: jump
- `A`: attack animation
- `H`: hurt animation
- `R`: reset to center spawn

## Acknowledgements

Phaser CLI is based on [Create React App][2] by Facebook and [vue-cli][3] by
Evan You.

[1]: https://github.com/phaser-cli/phaser-cli
[2]: https://github.com/facebook/create-react-app
[3]: https://github.com/vuejs/vue-cli
