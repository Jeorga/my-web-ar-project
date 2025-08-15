from django.http import JsonResponse
from .models import ThreeDModel

def model_list(request):
    """
    Returns all 3D models in JSON format:
    [
      { "name": "Model A", "url": "http://.../media/models/aoiBa_draco.glb" },
      ...
    ]
    """
    models_qs = ThreeDModel.objects.all()
    data = [
        {
            "name": m.name,
            "url": request.build_absolute_uri(m.file.url)
        }
        for m in models_qs
    ]
    return JsonResponse(data, safe=False)
