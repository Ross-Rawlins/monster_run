import {
  CharacterBodyDefinition,
  CharacterBodyProfileSet,
  CharacterState,
} from './types'

export type CharacterBodyProfileOverrides = Partial<
  Record<CharacterState, Partial<CharacterBodyDefinition>>
>

const BODY_PROFILE_STATES: readonly CharacterState[] = [
  'idle',
  'move',
  'run',
  'jump',
  'attack',
  'attack2',
  'attack3',
  'defend',
  'hurt',
  'death',
  'stunned',
  'rise',
]

export function defineBodyProfiles(
  defaultBody: CharacterBodyDefinition,
  overrides: CharacterBodyProfileOverrides = {},
  inheritedProfiles: CharacterBodyProfileSet = {}
): CharacterBodyProfileSet {
  const profiles: CharacterBodyProfileSet = { ...inheritedProfiles }

  for (const state of BODY_PROFILE_STATES) {
    const inheritedBody = inheritedProfiles[state] ?? defaultBody
    const override = overrides[state]

    if (!override && inheritedProfiles[state]) {
      continue
    }

    profiles[state] = {
      ...inheritedBody,
      ...override,
    }
  }

  return profiles
}

export function resolveBodyProfile(
  defaultBody: CharacterBodyDefinition,
  profiles: CharacterBodyProfileSet | undefined,
  state: CharacterState
): CharacterBodyDefinition {
  return profiles?.[state] ?? defaultBody
}
