from django.http import JsonResponse
from .models import ThreeDModel

def model_list(request):
    models_qs = ThreeDModel.objects.all()
    data = [
        {
            "name": m.name,
            "url": request.build_absolute_uri(m.file.url)
        }
        for m in models_qs
    ]
    return JsonResponse(data, safe=False)
