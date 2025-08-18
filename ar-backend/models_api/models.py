from django.db import models
from django.core.exceptions import ValidationError
from pathlib import Path

ALLOWED_EXTS = {".glb", ".usdz"}

def validate_3d_file(f):
    ext = Path(f.name).suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise ValidationError("Only .glb or .usdz files are allowed.")

class ARModel(models.Model):
    name = models.CharField(max_length=120)
    file = models.FileField(upload_to="models/", validators=[validate_3d_file])
    format = models.CharField(max_length=10, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        self.format = Path(self.file.name).suffix.lower().lstrip(".")
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
