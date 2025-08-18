from django.db import models

class ThreeDModel(models.Model):
    name = models.CharField(max_length=100)
    file = models.FileField(upload_to='models/')
    description = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return self.name
