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


def levenshtein_distance(a, b):
    a = a or ""
    b = b or ""
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    previous_row = list(range(len(b) + 1))
    for i, ca in enumerate(a, start=1):
        current_row = [i]
        for j, cb in enumerate(b, start=1):
            insertions = previous_row[j] + 1
            deletions = current_row[j - 1] + 1
            substitutions = previous_row[j - 1] + (ca != cb)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]


def normalized_distance(a, b):
    if not a and not b:
        return 0.0
    return float(levenshtein_distance(a, b)) / float(max(len(a), len(b), 1))


def find_track(song, target):
    if not target:
        return song.view.selected_track if hasattr(song.view, "selected_track") else None
    track_name = target.get("track_name") if isinstance(target, dict) else None
    role = target.get("role") if isinstance(target, dict) else None
    tracks = list(song.tracks)
    visible_tracks = list(song.visible_tracks) if hasattr(song, "visible_tracks") else tracks
    return_tracks = list(song.return_tracks) if hasattr(song, "return_tracks") else []
    all_tracks = tracks + return_tracks

    if isinstance(track_name, str) and track_name.strip().isdigit():
        index = int(track_name.strip()) - 1
        if 0 <= index < len(visible_tracks):
            return visible_tracks[index]
        if 0 <= index < len(all_tracks):
            return all_tracks[index]

    if track_name:
        for track in all_tracks:
            if track.name.lower() == track_name.lower():
                return track
    if role:
        for track in all_tracks:
            if role.lower() in track.name.lower():
                return track
    return song.view.selected_track if hasattr(song.view, "selected_track") else None


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
    query = str(name or "").strip().lower()
    if not query:
        return None

    best_item = None
    best_score = 1.0

    def walk(item):
        nonlocal best_item, best_score
        try:
            children = list(item.children)
        except Exception:
            children = []
        for child in children:
            try:
                child_name = str(child.name).lower()
            except Exception:
                child_name = ""
            if query == child_name:
                return child
            if query in child_name and child_name:
                score = 0.0
            else:
                score = normalized_distance(query, child_name)
            if score < best_score:
                best_score = score
                best_item = child
            if hasattr(child, "children") and len(child.children) > 0:
                found = walk(child)
                if found:
                    return found
        return None

    exact_or_partial = walk(browser_item)
    if exact_or_partial:
        return exact_or_partial
    if best_item and best_score <= 0.45:
        return best_item
    return None
