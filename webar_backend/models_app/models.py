# models_app/models.py
from django.db import models

class ThreeDModel(models.Model):
    # A text field for the display name in the dropdown
    name = models.CharField(max_length=100)
    
    # A file field for uploading the actual 3D file (.glb)
    file = models.FileField(upload_to='models/')

    def __str__(self):
        return self.name
