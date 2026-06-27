import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { useCreateUsuario, useUpdateUsuario, useSetPassword } from './useUsuarios'
import type { Usuario } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  usuario?: Usuario
}

export function UsuarioModal({ open, onClose, usuario }: Props) {
  const isEdit = !!usuario
  const create = useCreateUsuario()
  const update = useUpdateUsuario()
  const setPwd = useSetPassword()
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState('user')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (open) {
      setNombre(usuario?.usuario ?? '')
      setRol(usuario?.rol ?? 'user')
      setPassword('')
    }
  }, [open, usuario])

  async function submit() {
    if (isEdit) {
      await update.mutateAsync({ id: usuario!.id, usuario: nombre.trim(), rol })
      if (password.trim()) await setPwd.mutateAsync({ id: usuario!.id, password: password.trim() })
    } else {
      await create.mutateAsync({ usuario: nombre.trim(), password: password.trim(), rol })
    }
    onClose()
  }

  const disabled = !nombre.trim() || (!isEdit && !password.trim())

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}>
      <div className="flex flex-col gap-3">
        <Field label="Usuario *">
          <Input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <Field label="Rol">
          <Select value={rol} onChange={(e) => setRol(e.target.value)}>
            <option value="user">Usuario</option>
            <option value="admin">Administrador</option>
          </Select>
        </Field>
        <Field label={isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña *'}>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isEdit ? 'Dejar vacío para no cambiar' : ''}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={disabled}
            isLoading={create.isPending || update.isPending || setPwd.isPending}
          >
            {isEdit ? 'Guardar' : 'Crear'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
