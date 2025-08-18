from django.contrib import admin
from .models import ARModel

@admin.register(ARModel)
class ARModelAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "format", "created_at")
    search_fields = ("name",)
    list_filter = ("format", "created_at")
