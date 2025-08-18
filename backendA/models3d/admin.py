from django.contrib import admin
from .models import ThreeDModel

@admin.register(ThreeDModel)
class ThreeDModelAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'file')
    search_fields = ('name',)
