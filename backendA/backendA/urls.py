from django.contrib import admin
from django.urls import path
from models3d.views import model_list
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/models/', model_list, name="model-list"),
]

# Serve uploaded 3D files in dev
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
