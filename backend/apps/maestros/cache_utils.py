from django.conf import settings
from django.core.cache import cache
from rest_framework.response import Response


def delete_cache_pattern(pattern):
    delete_pattern = getattr(cache, 'delete_pattern', None)
    if delete_pattern:
        delete_pattern(pattern)


class CachedListMixin:
    cache_prefix = 'api'
    cache_timeout = None

    def get_cache_timeout(self):
        return self.cache_timeout or getattr(settings, 'API_CACHE_TIMEOUT', 300)

    def get_cache_key(self):
        return f'{self.cache_prefix}:list:{self.request.get_full_path()}'

    def invalidate_cache(self):
        delete_cache_pattern('maestros:*')

    def list(self, request, *args, **kwargs):
        key = self.get_cache_key()
        cached = cache.get(key)
        if cached is not None:
            return Response(cached)

        response = super().list(request, *args, **kwargs)
        if 200 <= response.status_code < 300:
            cache.set(key, response.data, self.get_cache_timeout())
        return response

    def perform_create(self, serializer):
        serializer.save()
        self.invalidate_cache()

    def perform_update(self, serializer):
        serializer.save()
        self.invalidate_cache()

    def perform_destroy(self, instance):
        instance.delete()
        self.invalidate_cache()
