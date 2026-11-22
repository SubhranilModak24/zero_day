"""
VouchPay — Advanced Forensic Analyzer
1. Local Block-Level Error Level Analysis (ELA) for localized edit detection
2. Deep AI Generation & Modification Scanner (C2PA, IPTC, XMP, PNG chunks, EXIF)
3. Graphic Editor Signature Scanner (Photoshop, Canva, PicsArt, etc.)
4. Screen Aspect Ratio & Smartphone Provenance
5. Cryptographic SHA-256 Provenance
Parameter Weight: 30% of Trust Score
"""

import hashlib
import io
import os
import re
import numpy as np
from PIL import Image, ImageChops, ImageEnhance, ExifTags
from app.schemas import ForensicResult


class ForensicAnalyzer:
    """Forensic integrity engine specialized in AI generation and localized pixel tampering."""

    AI_SIGNATURES = [
        # C2PA and digital provenance
        "c2pa", "jumbf", "contentcredentials", "cai",
        # IPTC AI standard tags
        "trainedalgorithmicmedia", "compositewithtrainedalgorithmicmedia",
        # Adobe AI
        "generative fill", "generative expand", "firefly", "adobe firefly",
        # Generative models
        "midjourney", "dall-e", "dalle", "openai", "chatgpt",
        "stable diffusion", "stablediffusion", "sdxl", "sd_xl",
        "comfyui", "automatic1111", "a1111", "invokeai", "fooocus", "forge",
        "novelai", "runway", "pika", "krea", "magnific",
        # Photo AI & Inpainting apps
        "magic eraser", "magic editor", "object eraser", "remini",
        "cleanup.pictures", "photoroom", "clipdrop", "faceapp",
        "apple intelligence", "image playground", "genmoji",
        "samsung galaxy ai", "generative edit",
        "canva magic", "magic edit",
        # AI metadata keywords
        "negative prompt", "cfg scale", "steps:", "sampler:", "model hash",
    ]

    EDITOR_SIGNATURES = [
        "photoshop", "canva", "picsart", "snapseed", "lightroom",
        "gimp", "pixlr", "fotor", "adobe", "paint.net", "inshot",
        "photopea", "pixelmator", "vsco", "meitu", "procreate",
        "coreldraw", "illustrator", "sketch", "figma", "befunky",
    ]

    def analyze(self, image_path: str, output_dir: str) -> ForensicResult:
        """Run full block-level pixel and multi-channel metadata analysis."""
        image_hash = self._compute_sha256(image_path)
        ela_path, tamper_score = self._block_ela_analysis(image_path, output_dir)
        metadata_flags = self._comprehensive_metadata_scan(image_path)

        return ForensicResult(
            ela_image_path=ela_path,
            tamper_score=tamper_score,
            exif_flags=metadata_flags,
            image_sha256=image_hash,
        )

    # ------------------------------------------------------------- SHA-256
    def _compute_sha256(self, file_path: str) -> str:
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    # ------------------------------------------------------------- Local Block ELA
    def _block_ela_analysis(
        self, image_path: str, output_dir: str, quality: int = 90
    ) -> tuple[str, float]:
        """
        Analyzes Error Level Analysis at local block resolution (32x32).
        Fraudsters edit small regions (amount or UTR) which represent < 1% of total pixels.
        Global averaging hides small edits; local peak block analysis exposes them.
        """
        original = Image.open(image_path).convert("RGB")

        # Re-save at target JPEG quality
        buf = io.BytesIO()
        original.save(buf, format="JPEG", quality=quality)
        buf.seek(0)
        resaved = Image.open(buf).convert("RGB")

        # Pixel difference
        diff = ImageChops.difference(original, resaved)

        # Generate visual heatmap
        extrema = diff.getextrema()
        max_val = max(ch[1] for ch in extrema) if extrema else 1
        scale = 255.0 / max_val if max_val > 0 else 1.0
        ela_image = ImageEnhance.Brightness(diff).enhance(scale * 0.85)

        ela_path = os.path.join(output_dir, "ela_heatmap.jpg")
        ela_image.save(ela_path, "JPEG", quality=95)

        # Convert difference to numpy 2D intensity array
        diff_arr = np.array(diff, dtype=np.float32).mean(axis=2)
        h, w = diff_arr.shape

        # Calculate localized 32x32 block means
        block_size = 32
        block_means = []
        for y in range(0, max(1, h - block_size), block_size):
            for x in range(0, max(1, w - block_size), block_size):
                block = diff_arr[y:y+block_size, x:x+block_size]
                if block.size > 0:
                    block_means.append(float(block.mean()))

        if block_means:
            median_block = float(np.median(block_means))
            max_block = float(max(block_means))
            
            # Discrepancy ratio: how much hotter is the edited patch compared to the rest of the image
            discrepancy_ratio = max_block / (median_block + 0.5)

            # Clean uniform screenshots have max_block < 9.0
            # Tampered screenshots have high localized ELA residuals: max_block > 15.0 or (max_block > 10.0 and discrepancy_ratio > 6.0)
            if max_block >= 16.0 or (max_block >= 11.0 and discrepancy_ratio >= 6.0):
                tamper_score = min(100.0, 50.0 + (max_block * 2.2) + (discrepancy_ratio * 1.5))
            elif max_block >= 9.0 and discrepancy_ratio >= 3.5:
                tamper_score = min(65.0, 30.0 + (max_block * 1.8) + (discrepancy_ratio * 1.0))
            else:
                # Clean compression
                tamper_score = max(0.0, min(15.0, (max_block / 9.0) * 15.0))
        else:
            tamper_score = 0.0

        return ela_path, round(float(tamper_score), 2)

    # ------------------------------------------------------------- Comprehensive Metadata & AI Scan
    def _comprehensive_metadata_scan(self, image_path: str) -> list[str]:
        flags: list[str] = []

        try:
            with Image.open(image_path) as img:
                w, h = img.size

                # 1. Screen Aspect Ratio & Dimensions Audit
                ratio = max(w, h) / min(w, h) if min(w, h) > 0 else 1.0
                is_portrait = h >= w
                if not is_portrait:
                    flags.append("SCREENSHOT_ORIENTATION: Image is landscape orientation (uncommon for phone UPI receipts)")
                elif ratio < 1.45:
                    flags.append(f"SCREENSHOT_ASPECT_RATIO: Square or non-phone aspect ratio {w}x{h} (ratio: {ratio:.2f}) indicates cropping or AI generation (1:1 standard)")
                elif ratio > 2.50:
                    flags.append(f"SCREENSHOT_ASPECT_RATIO: Atypical long aspect ratio {w}x{h} (ratio: {ratio:.2f})")

                # 2. EXIF Metadata Scan (all tags)
                exif = img._getexif()
                if exif:
                    for tag_id, value in exif.items():
                        tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                        val_str = str(value).lower()

                        # Check for AI generation signatures in EXIF
                        for sig in self.AI_SIGNATURES:
                            if sig in val_str:
                                flags.append(f"AI_METADATA_DETECTED: EXIF {tag_name} contains AI signature '{sig}' ('{str(value)[:60]}')")
                                break

                        # Check for Photo Editor signatures in EXIF
                        for editor in self.EDITOR_SIGNATURES:
                            if editor in val_str:
                                flags.append(f"EDITOR_METADATA_DETECTED: EXIF {tag_name} contains editor '{editor}' ('{str(value)[:60]}')")
                                break

                        if tag_name in ("DateTime", "DateTimeOriginal"):
                            flags.append(f"EXIF_TIMESTAMP: {value}")
                else:
                    flags.append("NO_EXIF_METADATA")

                # 3. PNG Info & Text Chunks (Stable Diffusion, ComfyUI, Canva, Photopea)
                if hasattr(img, "info") and img.info:
                    for k, v in img.info.items():
                        k_lower = str(k).lower()
                        v_lower = str(v).lower()

                        # Check for Stable Diffusion / ComfyUI parameters chunk
                        if k_lower in ("parameters", "prompt", "workflow"):
                            flags.append(f"AI_METADATA_DETECTED: PNG chunk '{k}' contains AI model prompt/workflow generation graph")

                        # Check for AI signatures in any text chunk
                        for sig in self.AI_SIGNATURES:
                            if sig in v_lower or sig in k_lower:
                                flags.append(f"AI_METADATA_DETECTED: PNG chunk '{k}' contains '{sig}'")
                                break

                        # Check for Editor signatures in any text chunk
                        for editor in self.EDITOR_SIGNATURES:
                            if editor in v_lower:
                                flags.append(f"EDITOR_METADATA_DETECTED: PNG chunk '{k}' contains '{editor}'")
                                break

                # 4. ICC Profile Check
                icc = img.info.get("icc_profile")
                if icc:
                    icc_lower = str(icc).lower()
                    if "adobe rgb" in icc_lower or "photoshop" in icc_lower:
                        flags.append("ICC_PROFILE_EDITOR: Desktop Adobe RGB / Photoshop color profile detected")

        except Exception as e:
            flags.append(f"METADATA_READ_WARNING: {str(e)}")

        # 5. Raw Binary Scan for Embedded XMP XML, C2PA, and Hidden AI Prompts
        raw_flags = self._scan_raw_binary(image_path)
        flags.extend(raw_flags)

        # De-duplicate flags while preserving order
        seen = set()
        unique_flags = []
        for f in flags:
            if f not in seen:
                seen.add(f)
                unique_flags.append(f)

        return unique_flags

    def _scan_raw_binary(self, file_path: str) -> list[str]:
        """Scans raw file bytes for C2PA provenance manifests, IPTC digital source types, and XMP XML packets."""
        flags: list[str] = []
        try:
            with open(file_path, "rb") as f:
                # Read up to 4MB (covers full metadata blocks in JPEG/PNG/WebP)
                header_data = f.read(4 * 1024 * 1024)

            raw_lower = header_data.decode("utf-8", errors="ignore").lower()

            # A. C2PA / Content Credentials Provenance
            if "c2pa" in raw_lower or "contentcredentials" in raw_lower or "jumbf" in raw_lower:
                flags.append("AI_METADATA_DETECTED: C2PA Content Credentials provenance manifest found (AI generation / synthetic media provenance)")

            # B. IPTC Standard Digital Source Type for AI
            if "trainedalgorithmicmedia" in raw_lower or "compositewithtrainedalgorithmicmedia" in raw_lower:
                flags.append("AI_METADATA_DETECTED: IPTC DigitalSourceType indicates trained algorithmic / generative AI media")

            # C. Generative Actions in XMP
            if re.search(r"generative[-_\s]*(?:fill|expand|ai)", raw_lower):
                flags.append("AI_METADATA_DETECTED: Adobe Generative Fill / Generative Expand action found in XMP history")

            # D. AI Tools in XMP or binary
            for sig in ["dall-e", "midjourney", "firefly", "stable diffusion", "comfyui", "automatic1111", "remini", "cleanup.pictures"]:
                if sig in raw_lower and not any(sig in f.lower() for f in flags):
                    flags.append(f"AI_METADATA_DETECTED: Embedded binary signature for '{sig}'")
                    break

            # E. Photo Editors in XMP or binary
            for editor in ["canva", "photoshop", "picsart", "snapseed", "photopea", "pixlr", "inshot"]:
                if editor in raw_lower and not any(editor in f.lower() for f in flags):
                    flags.append(f"EDITOR_METADATA_DETECTED: Embedded binary signature for '{editor}'")
                    break

        except Exception:
            pass

        return flags
