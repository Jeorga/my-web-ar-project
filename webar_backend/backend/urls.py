from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from models_app.views import model_list

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/models/', model_list),  # API endpoint for AR site
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
