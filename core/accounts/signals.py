from django.db.models.signals import post_save
from django.contrib.auth.models import User
from django.dispatch import receiver
from .models import Profile, UserRole


@receiver(post_save, sender=User)
def create_user_profile_and_role(sender, instance, created, **kwargs):
    if not created:
        return

    Profile.objects.get_or_create(
        user=instance,
        defaults={'display_name': instance.get_full_name() or instance.username}
    )

    if instance.is_superuser:
        UserRole.objects.get_or_create(user=instance, role='admin')
    else:
        total_users = User.objects.filter(is_superuser=False).count()
        role = 'admin' if total_users == 1 else 'employee'
        UserRole.objects.get_or_create(user=instance, role=role)
