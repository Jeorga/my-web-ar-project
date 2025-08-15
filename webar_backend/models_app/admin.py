# models_app/admin.py
from django.contrib import admin
from .models import ThreeDModel

@admin.register(ThreeDModel)
class ThreeDModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'file')  # Show name + file in the list view
