"""
VouchPay — Firebase Firestore Integration
Stores and queries user verification records securely.
Reads credentials from .env; falls back gracefully to in-memory store if not configured.
"""

import json
import os
from typing import Any, Dict, List, Optional

_db = None
_firebase_initialized = False

# Resilient in-memory fallback cache if Firebase is not yet configured in .env
_local_user_cache: Dict[str, Dict[str, Dict[str, Any]]] = {}
_local_global_cache: Dict[str, Dict[str, Any]] = {}


def init_firebase():
    """Initializes Firebase Admin SDK using credentials from environment variables."""
    global _db, _firebase_initialized

    if _firebase_initialized:
        return _db

    cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
    cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    project_id = os.getenv("FIREBASE_PROJECT_ID")

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            _db = firestore.client()
            _firebase_initialized = True
            print(f"[VouchPay Firebase] Connected to Firestore using service account file: {cred_path}")
        elif cred_json:
            service_account_info = json.loads(cred_json)
            cred = credentials.Certificate(service_account_info)
            firebase_admin.initialize_app(cred)
            _db = firestore.client()
            _firebase_initialized = True
            print("[VouchPay Firebase] Connected to Firestore using service account JSON string.")
        elif project_id:
            firebase_admin.initialize_app(options={"projectId": project_id})
            _db = firestore.client()
            _firebase_initialized = True
            print(f"[VouchPay Firebase] Connected to Firestore with project ID: {project_id}")
        else:
            print("[VouchPay Firebase] Notice: No Firebase credentials in .env. Running in local fallback mode.")
    except Exception as e:
        print(f"[VouchPay Firebase] Warning: Could not initialize Firebase Admin SDK ({e}). Running in local fallback mode.")

    return _db


def save_user_verification(user_id: str, tx_data: Dict[str, Any]) -> bool:
    """Saves a verification record under the specific user's Firestore document."""
    tx_id = tx_data.get("tx_id") or tx_data.get("id")
    if not tx_id:
        return False

    # Keep local in-memory cache synchronized
    if user_id not in _local_user_cache:
        _local_user_cache[user_id] = {}
    _local_user_cache[user_id][tx_id] = {**tx_data, "user_id": user_id}
    _local_global_cache[tx_id] = {**tx_data, "user_id": user_id}

    db = init_firebase()
    if not db:
        return True

    try:
        # Save to users/{user_id}/verifications/{tx_id}
        doc_ref = db.collection("users").document(user_id).collection("verifications").document(tx_id)
        doc_ref.set(tx_data, merge=True)

        # Also maintain a top-level verifications record for global audit / dual-party link
        global_ref = db.collection("verifications").document(tx_id)
        global_ref.set({**tx_data, "user_id": user_id}, merge=True)
        return True
    except Exception as e:
        print(f"[VouchPay Firebase] Error saving verification: {e}")
        return False


def get_user_verifications(user_id: str) -> List[Dict[str, Any]]:
    """Retrieves all verification records for a specific user, sorted newest first."""
    db = init_firebase()
    if not db:
        user_records = list(_local_user_cache.get(user_id, {}).values())
        user_records.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return user_records

    try:
        docs = (
            db.collection("users")
            .document(user_id)
            .collection("verifications")
            .order_by("created_at", direction="DESCENDING")
            .limit(100)
            .stream()
        )
        firestore_records = [doc.to_dict() for doc in docs]
        if firestore_records:
            return firestore_records
        # Fall back to local cache if Firestore returned empty
        return list(_local_user_cache.get(user_id, {}).values())
    except Exception as e:
        print(f"[VouchPay Firebase] Error retrieving verifications: {e}")
        return list(_local_user_cache.get(user_id, {}).values())


def update_handshake_status(tx_id: str, status: str, trust_score: int, handshake_status: str) -> bool:
    """Updates dual-party handshake status and trust score in Firestore."""
    # Update local fallback caches
    if tx_id in _local_global_cache:
        _local_global_cache[tx_id].update({
            "status": status,
            "trust_score": trust_score,
            "handshake_status": handshake_status,
        })
        user_id = _local_global_cache[tx_id].get("user_id")
        if user_id and user_id in _local_user_cache and tx_id in _local_user_cache[user_id]:
            _local_user_cache[user_id][tx_id].update({
                "status": status,
                "trust_score": trust_score,
                "handshake_status": handshake_status,
            })

    db = init_firebase()
    if not db:
        return True

    try:
        update_payload = {
            "status": status,
            "trust_score": trust_score,
            "handshake_status": handshake_status,
        }
        # Update global record
        global_ref = db.collection("verifications").document(tx_id)
        doc = global_ref.get()
        if doc.exists:
            user_id = doc.to_dict().get("user_id")
            global_ref.update(update_payload)
            if user_id:
                user_doc_ref = db.collection("users").document(user_id).collection("verifications").document(tx_id)
                user_doc_ref.update(update_payload)
        return True
    except Exception as e:
        print(f"[VouchPay Firebase] Error updating handshake: {e}")
        return False
