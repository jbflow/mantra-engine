from .live_helpers import (
    adjust_timbre,
    find_clip_slot,
    find_scene,
    find_track,
    load_browser_device,
    set_key_signature,
)


class IntentRouter:
    def __init__(self, control_surface, transport_actions, focus_state):
        self._control_surface = control_surface
        self._transport = transport_actions
        self._focus = focus_state

    @property
    def song(self):
        return self._control_surface.song()

    def route_intent(self, intent):
        if not isinstance(intent, dict):
            return "error", {"message": "Intent must be an object"}
        domain = intent.get("domain")
        payload = intent.get("intent")
        if not domain or not isinstance(payload, dict):
            return "error", {"message": "Invalid intent shape"}

        action = payload.get("action")
        target = self._focus.resolve_target(payload)
        self._focus.update(domain=domain, target=target)

        if domain == "transport":
            return self._handle_transport(action, payload)
        if domain == "structure":
            return self._handle_structure(action, payload, target)
        if domain == "music":
            return self._handle_music(action, payload, target)
        if domain == "harmony":
            return self._handle_harmony(action, payload)
        if domain == "rhythm":
            return self._handle_rhythm(action, payload)
        if domain == "performance":
            return self._handle_performance(action, payload, target)
        if domain == "timbre":
            return self._handle_timbre(action, payload, target)

        return "error", {"message": f"Unsupported domain: {domain}"}

    def _handle_transport(self, action, payload):
        try:
            if action == "play":
                self._transport.play()
                return "ok", None
            if action == "stop":
                self._transport.stop()
                return "ok", None
            if action == "record":
                self._transport.record_enable()
                return "ok", None
            if action == "toggle_record":
                self.song.record_mode = 0 if self.song.record_mode else 1
                return "ok", None
            if action == "loop_on":
                self._transport.loop_enable()
                return "ok", None
            if action == "loop_off":
                self._transport.loop_disable()
                return "ok", None
            if action == "metronome_on":
                self._transport.click_enable()
                return "ok", None
            if action == "metronome_off":
                self._transport.click_disable()
                return "ok", None
            if action == "set_tempo":
                bpm = payload.get("bpm")
                if isinstance(bpm, (int, float)):
                    self._transport.set_tempo(bpm)
                    return "ok", None
                return "error", {"message": "Missing bpm"}
            if action == "set_time_signature":
                numerator = payload.get("numerator")
                denominator = payload.get("denominator")
                if isinstance(numerator, int) and isinstance(denominator, int):
                    self.song.signature_numerator = numerator
                    self.song.signature_denominator = denominator
                    return "ok", None
                return "error", {"message": "Missing numerator/denominator"}
            if action == "locate":
                bars = payload.get("bars")
                beats = payload.get("beats") or 1
                timecode = payload.get("timecode")
                if isinstance(timecode, str):
                    return "error", {"message": "Timecode locate not supported"}
                if isinstance(bars, int):
                    signature = self.song.signature_numerator
                    beat_position = ((bars - 1) * signature) + max(0, beats - 1)
                    if hasattr(self.song, "current_song_time"):
                        self.song.current_song_time = beat_position
                        return "ok", None
                    return "error", {"message": "Song position not supported"}
            if action == "set_loop":
                start_bars = payload.get("startBars")
                length_bars = payload.get("lengthBars")
                if isinstance(start_bars, int) and isinstance(length_bars, int):
                    signature = self.song.signature_numerator
                    self.song.loop_start = (start_bars - 1) * signature
                    self.song.loop_length = length_bars * signature
                    self.song.loop = 1
                    return "ok", None
                return "error", {"message": "Missing startBars/lengthBars"}
        except Exception as e:
            return "error", {"message": str(e)}

        return "error", {"message": f"Unsupported transport action: {action}"}

    def _handle_structure(self, action, payload, target):
        track = find_track(self.song, target)
        try:
            if action == "create_track":
                track_type = payload.get("type")
                if track_type == "midi":
                    self.song.create_midi_track()
                else:
                    self.song.create_audio_track()
                return "ok", None
            if not track:
                return "error", {"message": "Target track not found"}
            if action == "select_track":
                self.song.view.selected_track = track
                return "ok", None
            if action == "arm_track":
                track.arm = 1
                return "ok", None
            if action == "disarm_track":
                track.arm = 0
                return "ok", None
            if action == "mute":
                track.mute = 1
                return "ok", None
            if action == "unmute":
                track.mute = 0
                return "ok", None
            if action == "solo":
                track.solo = 1
                return "ok", None
            if action == "unsolo":
                track.solo = 0
                return "ok", None
            if action == "load_device":
                device_name = payload.get("device")
                kind = payload.get("kind")
                if not device_name:
                    return "error", {"message": "Missing device name"}
                return load_browser_device(self._control_surface, track, device_name, kind)
        except Exception as e:
            return "error", {"message": str(e)}

        return "error", {"message": f"Unsupported structure action: {action}"}

    def _handle_music(self, action, payload, target):
        try:
            if action == "quantize":
                strength = payload.get("strength", 0.8)
                clip = self.song.view.detail_clip if hasattr(self.song.view, "detail_clip") else None
                if clip and getattr(clip, "is_midi_clip", False) and hasattr(clip, "quantize"):
                    clip.quantize(float(strength), 1.0)
                    return "ok", None
                return "error", {"message": "No MIDI clip selected for quantize"}
            if action == "transpose":
                semitones = payload.get("semitones")
                clip = self.song.view.detail_clip if hasattr(self.song.view, "detail_clip") else None
                if clip and getattr(clip, "is_midi_clip", False) and hasattr(clip, "transpose"):
                    clip.transpose(int(semitones))
                    return "ok", None
                return "error", {"message": "No MIDI clip selected for transpose"}
            if action == "set_key_signature":
                key = payload.get("key")
                scale = payload.get("scale")
                return set_key_signature(self.song, key, scale)
        except Exception as e:
            return "error", {"message": str(e)}

        return "error", {"message": f"Unsupported music action: {action}"}

    def _handle_harmony(self, action, payload):
        try:
            if action == "set_key":
                tonic = payload.get("tonic")
                scale = payload.get("scale")
                return set_key_signature(self.song, tonic, scale)
            if action in ["set_chord", "set_chord_progression", "set_pitch_range"]:
                return "error", {"message": f"Harmony action not supported in Live API: {action}"}
        except Exception as e:
            return "error", {"message": str(e)}

        return "error", {"message": f"Unsupported harmony action: {action}"}

    def _handle_rhythm(self, action, payload):
        try:
            if action == "set_swing" and hasattr(self.song, "swing_amount"):
                amount = payload.get("amount")
                if isinstance(amount, (int, float)):
                    self.song.swing_amount = float(amount)
                    return "ok", None
            return "error", {"message": f"Rhythm action not supported in Live API: {action}"}
        except Exception as e:
            return "error", {"message": str(e)}

    def _handle_performance(self, action, payload, target):
        try:
            if action == "trigger_scene":
                scene_name = payload.get("scene_name")
                scene = find_scene(self.song, scene_name)
                if scene:
                    scene.fire()
                    return "ok", None
                return "error", {"message": "Scene not found"}
            if action == "trigger_clip":
                clip_name = payload.get("clip_name")
                track = find_track(self.song, target)
                if not track:
                    return "error", {"message": "Target track not found"}
                clip_slot = find_clip_slot(track, clip_name)
                if clip_slot:
                    clip_slot.fire()
                    return "ok", None
                return "error", {"message": "Clip not found"}
        except Exception as e:
            return "error", {"message": str(e)}

        return "error", {"message": f"Unsupported performance action: {action}"}

    def _handle_timbre(self, action, payload, target):
        try:
            track = find_track(self.song, target)
            if not track:
                return "error", {"message": "Target track not found"}
            if action == "adjust":
                attribute = payload.get("attribute")
                amount = payload.get("amount")
                return adjust_timbre(track, attribute, amount)
            if action == "adjust_many":
                changes = payload.get("changes")
                if not isinstance(changes, list):
                    return "error", {"message": "Missing changes array"}
                for change in changes:
                    attribute = change.get("attribute") if isinstance(change, dict) else None
                    amount = change.get("amount") if isinstance(change, dict) else None
                    adjust_timbre(track, attribute, amount)
                return "ok", None
        except Exception as e:
            return "error", {"message": str(e)}

        return "error", {"message": f"Unsupported timbre action: {action}"}
