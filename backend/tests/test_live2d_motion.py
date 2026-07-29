from live2d_motion import (
    MotionDirectorV3,
    allowed_channels_for_model,
    filter_motion_plan_for_model,
    is_motion_v3_candidate,
    normalize_live2d_model,
    parse_motion_plan,
)


def valid_motion(**changes):
    motion = {
        "duration_ms": 1800,
        "variation_seed": 7,
        "blend": {"in_ms": 100, "out_ms": 180},
        "tracks": [{
            "channel": "head_pitch",
            "mode": "override",
            "keyframes": [
                {"t": 0.0, "value": 0.0, "easing": "ease_in_out"},
                {"t": 0.5, "value": -0.6, "easing": "ease_in_out"},
                {"t": 1.0, "value": 0.0, "easing": "ease_in_out"},
            ],
        }],
    }
    motion.update(changes)
    return motion


def test_motion_v3_candidate_is_any_object_that_declares_tracks():
    assert is_motion_v3_candidate({"tracks": []}) is True
    assert is_motion_v3_candidate({"intent": "thinking"}) is False
    assert is_motion_v3_candidate([]) is False


def test_parse_motion_plan_keeps_only_safe_semantic_tracks():
    motion = valid_motion(tracks=[
        valid_motion()["tracks"][0],
        {
            "channel": "mouth_open",
            "mode": "override",
            "keyframes": [{"t": 0.0, "value": 0.0}, {"t": 1.0, "value": 1.0}],
        },
    ])

    parsed = parse_motion_plan(motion)

    assert [track["channel"] for track in parsed["tracks"]] == ["head_pitch"]


def test_parse_motion_plan_rejects_non_finite_and_out_of_order_frames():
    assert parse_motion_plan(valid_motion(tracks=[{
        "channel": "head_pitch",
        "mode": "override",
        "keyframes": [{"t": 0.8, "value": 0.0}, {"t": 0.2, "value": 0.4}],
    }])) is None
    assert parse_motion_plan(valid_motion(tracks=[{
        "channel": "head_pitch",
        "mode": "override",
        "keyframes": [{"t": 0.0, "value": float("nan")}, {"t": 1.0, "value": 0.0}],
    }])) is None


def test_parse_motion_plan_accepts_time_bounds_and_drops_out_of_range_track():
    parsed = parse_motion_plan(valid_motion(tracks=[
        {
            "channel": "head_pitch",
            "mode": "override",
            "keyframes": [{"t": 0.0, "value": 0.0}, {"t": 1.0, "value": 0.0}],
        },
        {
            "channel": "head_yaw",
            "mode": "override",
            "keyframes": [{"t": -0.01, "value": 0.0}, {"t": 1.0, "value": 0.0}],
        },
    ]))

    assert [track["channel"] for track in parsed["tracks"]] == ["head_pitch"]


def test_parse_motion_plan_accepts_value_bounds_and_drops_out_of_range_track():
    parsed = parse_motion_plan(valid_motion(tracks=[
        {
            "channel": "head_pitch",
            "mode": "override",
            "keyframes": [{"t": 0.0, "value": -1.0}, {"t": 1.0, "value": 1.0}],
        },
        {
            "channel": "head_yaw",
            "mode": "override",
            "keyframes": [{"t": 0.0, "value": 0.0}, {"t": 1.0, "value": 1.01}],
        },
    ]))

    assert [track["channel"] for track in parsed["tracks"]] == ["head_pitch"]


def test_parse_motion_plan_clamps_ai_duration_at_4000_ms():
    parsed = parse_motion_plan(valid_motion(duration_ms=9999))

    assert parsed["duration_ms"] == 4000


def test_director_overwrites_ai_authority_fields_and_rate_limits_per_user():
    now = [1785124800.0]
    director = MotionDirectorV3(
        clock=lambda: now[0],
        id_factory=lambda: "motion-1",
    )

    event = director.decide("u-1", {
        **valid_motion(),
        "type": "forged",
        "source": "user_command",
        "motion_id": "forged-id",
        "created_at_ms": 1,
    })

    assert event["type"] == "live2d_motion_v3"
    assert event["source"] == "ai_reply"
    assert event["motion_id"] == "motion-1"
    assert event["created_at_ms"] == 1785124800000
    assert event["expires_at_ms"] == 1785124810000
    assert director.decide("u-1", valid_motion()) is None
    assert director.decide("u-2", valid_motion()) is not None


def test_model_normalization_accepts_only_the_two_exact_model_names():
    assert normalize_live2d_model("hiyori") == "hiyori"
    assert normalize_live2d_model("panda_cake") == "panda_cake"
    assert normalize_live2d_model("Hiyori") is None
    assert normalize_live2d_model(None) is None
    assert allowed_channels_for_model("unknown") == frozenset({
        "head_yaw", "head_pitch", "head_roll",
        "body_yaw", "body_pitch", "body_roll",
        "gaze_x", "gaze_y", "eye_open", "eye_smile",
        "brow_y", "brow_form", "cheek",
    })


def test_hiyori_arm_raise_accepts_unit_interval_and_drops_invalid_values():
    arm_track = {
        "channel": "left_arm_raise",
        "mode": "override",
        "keyframes": [{"t": 0, "value": 0}, {"t": 1, "value": 1}],
    }
    invalid_high = {
        **arm_track,
        "keyframes": [{"t": 0, "value": 0}, {"t": 1, "value": 1.1}],
    }
    invalid_negative = {
        **arm_track,
        "keyframes": [{"t": 0, "value": 0}, {"t": 1, "value": -0.1}],
    }

    parsed = parse_motion_plan(
        valid_motion(tracks=[arm_track, invalid_high, invalid_negative]),
        model_name="hiyori",
    )

    assert [track["channel"] for track in parsed["tracks"]] == ["left_arm_raise"]


def test_panda_channels_are_kept_but_hiyori_arm_channels_are_dropped():
    panda_hug = {
        "channel": "panda_hug",
        "mode": "additive",
        "keyframes": [{"t": 0, "value": 0}, {"t": 1, "value": 1}],
    }
    hiyori_arm = {
        "channel": "right_arm_raise",
        "mode": "override",
        "keyframes": [{"t": 0, "value": 0}, {"t": 1, "value": 1}],
    }

    parsed = parse_motion_plan(
        valid_motion(tracks=[panda_hug, hiyori_arm]), model_name="panda_cake"
    )

    assert [track["channel"] for track in parsed["tracks"]] == ["panda_hug"]


def test_panda_channels_reject_negative_activation_values():
    negative_hug = {
        "channel": "panda_hug",
        "mode": "override",
        "keyframes": [{"t": 0, "value": 0}, {"t": 1, "value": -0.1}],
    }
    negative_face = {
        "channel": "hands_to_face",
        "mode": "override",
        "keyframes": [{"t": 0, "value": 0}, {"t": 1, "value": -0.1}],
    }

    assert parse_motion_plan(
        valid_motion(tracks=[negative_hug, negative_face]),
        model_name="panda_cake",
    ) is None


def test_unknown_or_missing_model_keeps_only_generic_channels():
    generic = valid_motion()["tracks"][0]
    panda_hug = {
        "channel": "panda_hug",
        "mode": "override",
        "keyframes": [{"t": 0, "value": 0}, {"t": 1, "value": 1}],
    }

    for model_name in (None, "unknown"):
        parsed = parse_motion_plan(
            valid_motion(tracks=[generic, panda_hug]), model_name=model_name
        )
        assert [track["channel"] for track in parsed["tracks"]] == ["head_pitch"]


def test_second_model_filter_removes_cross_model_tracks_from_a_parsed_plan():
    parsed_hiyori_plan = {
        **valid_motion(),
        "tracks": [
            valid_motion()["tracks"][0],
            {
                "channel": "left_hand_wave",
                "mode": "override",
                "keyframes": [
                    {"t": 0.0, "value": -1.0, "easing": "linear"},
                    {"t": 1.0, "value": 1.0, "easing": "linear"},
                ],
            },
        ],
    }

    filtered = filter_motion_plan_for_model(parsed_hiyori_plan, "panda_cake")

    assert [track["channel"] for track in filtered["tracks"]] == ["head_pitch"]
