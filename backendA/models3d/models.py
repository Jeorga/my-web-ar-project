from django.db import models

class ThreeDModel(models.Model):
    name = models.CharField(max_length=200)
    # Accept any file extension; you can validate in admin if needed
    file = models.FileField(upload_to='models/')

    def __str__(self):
        return self.name
