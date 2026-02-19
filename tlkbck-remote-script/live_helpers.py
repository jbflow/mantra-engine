NOTE_TO_ROOT = {
    "C": 0,
    "C#": 1,
    "DB": 1,
    "D": 2,
    "D#": 3,
    "EB": 3,
    "E": 4,
    "F": 5,
    "F#": 6,
    "GB": 6,
    "G": 7,
    "G#": 8,
    "AB": 8,
    "A": 9,
    "A#": 10,
    "BB": 10,
    "B": 11,
}


def clamp(value, min_value, max_value):
    return max(min_value, min(value, max_value))


def find_track(song, target):
    if not target:
        return song.view.selected_track if hasattr(song.view, "selected_track") else None
    track_name = target.get("track_name") if isinstance(target, dict) else None
    role = target.get("role") if isinstance(target, dict) else None
    tracks = list(song.tracks)

    if track_name:
        for track in tracks:
            if track.name.lower() == track_name.lower():
                return track
    if role:
        for track in tracks:
            if role.lower() in track.name.lower():
                return track
    return None


def set_key_signature(song, key, scale):
    if not key:
        return "error", {"message": "Missing key/tonic"}
    root = NOTE_TO_ROOT.get(str(key).upper())
    if root is None:
        return "error", {"message": "Invalid key"}
    try:
        if hasattr(song, "root_note"):
            song.root_note = int(root)
        if scale and hasattr(song, "scale_name"):
            song.scale_name = str(scale)
        return "ok", None
    except Exception as e:
        return "error", {"message": str(e)}


def find_scene(song, scene_name):
    scenes = list(song.scenes)
    if isinstance(scene_name, int):
        index = scene_name - 1
        return scenes[index] if 0 <= index < len(scenes) else None
    if isinstance(scene_name, str):
        for scene in scenes:
            if scene.name.lower() == scene_name.lower():
                return scene
    return None


def find_clip_slot(track, clip_name):
    if clip_name is None:
        return None
    if isinstance(clip_name, int):
        index = clip_name - 1
        if 0 <= index < len(track.clip_slots):
            return track.clip_slots[index]
    if isinstance(clip_name, str):
        for slot in track.clip_slots:
            if slot.has_clip and slot.clip.name.lower() == clip_name.lower():
                return slot
    return None


def find_device_parameter(track, keyword):
    for device in track.devices:
        for param in device.parameters:
            if keyword in param.name.lower():
                return param
    return None


def adjust_timbre(track, attribute, amount):
    if attribute is None or amount is None:
        return "error", {"message": "Missing timbre attribute/amount"}
    keyword = str(attribute).lower()
    param = find_device_parameter(track, keyword)
    if not param:
        return "error", {"message": f"No parameter found for {attribute}"}
    try:
        span = (param.max - param.min) if hasattr(param, "max") else 1.0
        delta = float(amount) * span * 0.2
        param.value = clamp(param.value + delta, param.min, param.max)
        return "ok", None
    except Exception as e:
        return "error", {"message": str(e)}


def load_browser_device(control_surface, track, device_name, kind):
    try:
        if control_surface.song().view.selected_track != track:
            control_surface.song().view.selected_track = track
        browser = control_surface.application().browser
        if kind == "instrument":
            collection = browser.instruments
        elif kind == "midi_effect":
            collection = browser.midi_effects
        else:
            collection = browser.audio_effects
        item = find_browser_item(collection, device_name)
        if item:
            browser.load_item(item)
            return "ok", None
        return "error", {"message": "Device not found in browser"}
    except Exception as e:
        return "error", {"message": str(e)}


def find_browser_item(browser_item, name):
    name = str(name).lower()
    try:
        for item in list(browser_item.children):
            if name in item.name.lower():
                return item
            if hasattr(item, "children") and len(item.children) > 0:
                found = find_browser_item(item, name)
                if found:
                    return found
    except Exception:
        return None
    return None
