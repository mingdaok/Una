import { describe, expect, it } from 'vitest';

const loadProfiles = () => import('../modelActionProfiles');

describe('model action profiles', () => {
  it('normalizes only supported model identifiers', async () => {
    const { normalizeLive2DModel } = await loadProfiles();

    expect(normalizeLive2DModel('hiyori')).toBe('hiyori');
    expect(normalizeLive2DModel('panda_cake')).toBe('panda_cake');
    expect(normalizeLive2DModel('HIYORI')).toBeNull();
    expect(normalizeLive2DModel('unknown')).toBeNull();
  });

  it('gives unknown models only the common semantic channels', async () => {
    const { channelsForModel } = await loadProfiles();

    expect([...channelsForModel('unknown')]).toEqual([
      'head_yaw', 'head_pitch', 'head_roll',
      'body_yaw', 'body_pitch', 'body_roll',
      'gaze_x', 'gaze_y', 'eye_open', 'eye_smile',
      'brow_y', 'brow_form', 'cheek',
    ]);
  });

  it('isolates model-specific action channels while retaining common channels', async () => {
    const { isChannelAllowedForModel } = await loadProfiles();

    expect(isChannelAllowedForModel('head_yaw', 'hiyori')).toBe(true);
    expect(isChannelAllowedForModel('left_arm_raise', 'hiyori')).toBe(true);
    expect(isChannelAllowedForModel('left_hand_wave', 'hiyori')).toBe(true);
    expect(isChannelAllowedForModel('panda_hug', 'hiyori')).toBe(false);
    expect(isChannelAllowedForModel('panda_hug', 'panda_cake')).toBe(true);
    expect(isChannelAllowedForModel('hands_to_face', 'panda_cake')).toBe(true);
    expect(isChannelAllowedForModel('left_arm_raise', 'panda_cake')).toBe(false);
  });

  it('uses channel-specific normalized value ranges', async () => {
    const { isSemanticValueValid } = await loadProfiles();

    expect(isSemanticValueValid('left_arm_raise', 0)).toBe(true);
    expect(isSemanticValueValid('left_arm_raise', 1)).toBe(true);
    expect(isSemanticValueValid('left_arm_raise', -0.1)).toBe(false);
    expect(isSemanticValueValid('left_arm_raise', 1.1)).toBe(false);
    expect(isSemanticValueValid('left_hand_wave', -1)).toBe(true);
    expect(isSemanticValueValid('panda_hug', -1)).toBe(true);
    expect(isSemanticValueValid('panda_hug', 1.1)).toBe(false);
  });

  it('filters tracks by the selected model without removing common tracks', async () => {
    const { filterMotionTracksForModel } = await loadProfiles();
    const tracks = [
      { channel: 'head_pitch' },
      { channel: 'left_arm_raise' },
      { channel: 'panda_hug' },
    ];

    expect(filterMotionTracksForModel(tracks, 'hiyori')).toEqual([
      { channel: 'head_pitch' },
      { channel: 'left_arm_raise' },
    ]);
    expect(filterMotionTracksForModel(tracks, 'panda_cake')).toEqual([
      { channel: 'head_pitch' },
      { channel: 'panda_hug' },
    ]);
    expect(filterMotionTracksForModel(tracks, 'unknown')).toEqual([
      { channel: 'head_pitch' },
    ]);
  });

  it('exposes immutable profiles containing the documented raw-parameter intents', async () => {
    const { getModelActionProfile } = await loadProfiles();

    const hiyori = getModelActionProfile('hiyori');
    const panda = getModelActionProfile('panda_cake');

    expect(hiyori.channels.left_arm_raise.parameterIds).toEqual(['PartArmA', 'ParamArmLA']);
    expect(hiyori.channels.right_arm_raise.parameterIds).toEqual(['PartArmA', 'ParamArmRA']);
    expect(hiyori.channels.left_hand_wave.parameterIds).toEqual(['ParamHandL']);
    expect(hiyori.channels.right_hand_wave.parameterIds).toEqual(['ParamHandR']);
    expect(hiyori.channels.left_arm_raise.targetValue).toBe(0);
    expect(hiyori.channels.left_arm_raise.restingValue).toBe(-10);
    expect(panda.channels.panda_hug.parameterIds).toEqual(['Param3']);
    expect(panda.channels.panda_hug.optionalPhysicsParameterIds).toEqual(['Param150', 'Param151', 'Param152']);
    expect(panda.channels.hands_to_face.parameterIds).toEqual(['Param5', 'Param6']);
    expect(panda.channels.hands_to_face.optionalPhysicsParameterIds).toEqual([
      'Param153', 'Param154', 'Param155', 'Param156', 'Param157', 'Param158',
    ]);
    expect(panda.channels.panda_hug.targetValue).toBe(1);
    expect(panda.channels.hands_to_face.targetValue).toBe(1);
    expect(Object.isFrozen(hiyori)).toBe(true);
    expect(Object.isFrozen(hiyori.channels.left_arm_raise.parameterIds)).toBe(true);
    expect(getModelActionProfile('unknown')).toBeNull();
  });
});
